import {
  Button,
  Input,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ChangeEvent, FormEvent, useReducer, useState } from "react";

import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { Tooltip } from "@chakra-ui/react";
import Fuse from "fuse.js";
import { AiFillEdit, AiOutlineEllipsis } from "react-icons/ai";
import CreateSponsor from "../components/CreateSponsor";
import DeleteModal from "../components/DeleteModal";
import EditModal from "../components/EditOfferModal";
import EditPodcastCategory from "../components/EditPodcastCategory";
import Extractor from "../components/Extractor";
import SelectCategory from "../components/SelectCategory";
import { Operations } from "../graphql/operations";
import { capitalizeString } from "../utils/functions";
import { REDUCER_ACTION_TYPE, initState, reducer } from "../utils/reducer";

const App = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isOpenDetails,
    onOpen: onOpenDetails,
    onClose: onCloseDetails,
  } = useDisclosure();

  const {
    isOpen: isOpenEditCategory,
    onOpen: onOpenEditCategory,
    onClose: onCloseEditCategory,
  } = useDisclosure();
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, initState);
  const [createPodcast] = useMutation(Operations.Mutations.CreatePodcast);
  const [updateColor] = useMutation(Operations.Mutations.UpdateColor);
  const [deletePodcast] = useMutation(Operations.Mutations.DeletePodcast);
  const [offset, setOffset] = useState(1);
  const [displayScrub, setDisplayScrub] = useState(false);
  const { data, refetch: refetchPodcasts } = useQuery(
    Operations.Queries.GetPodcasts
  );
  const [fetchCategory] = useLazyQuery(Operations.Queries.FetchCategory);
  const [fetchSpotify, { data: spotifyData, refetch: refetchSpotify }] =
    useLazyQuery(Operations.Queries.FetchSpotifyPodcast);

  const [getPodcast, { refetch: refetchCurrentPodcast }] = useLazyQuery(
    Operations.Queries.GetPodcast
  );

  const podcasts = data?.getPodcasts;

  let fusePreview: any;

  if (podcasts) {
    const fuse = new Fuse(podcasts, {
      keys: ["title"],
      includeScore: true,
    });

    fusePreview = fuse.search(state.text).map((preview: any) => {
      const { item } = preview;
      return item.title;
    });
  }

  const handlePodcastInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: REDUCER_ACTION_TYPE.INPUT_CHANGE,
      payload: e.target.value,
    });
  };

  const handleSelectPodcast = async (
    e: FormEvent<HTMLButtonElement> | FormEvent<HTMLFormElement>,
    preview: string,
    existingPodcast: boolean,
    offset: number
  ) => {
    e.preventDefault();
    const podcastTitleList = podcasts.map((podcast: any) => {
      return podcast.title;
    });

    if (!state.text) {
      return;
    }
    dispatch({ type: REDUCER_ACTION_TYPE.SELECT_PODCAST, payload: preview });

    if (existingPodcast) {
      setDisplayScrub(false);
      dispatch({
        type: REDUCER_ACTION_TYPE.TOGGLE_EXISTING_PODCAST,
        payload: true,
      });
    }
    try {
      if (existingPodcast) {
        const getCategory = await fetchCategory({
          variables: {
            input: { podcast: preview },
          },
        });

        dispatch({
          type: REDUCER_ACTION_TYPE.UPDATE_CURRENT_PODCAST,
          payload: { category: getCategory.data.fetchCategory },
        });
      }

      await Promise.all([
        /* Fetching new podcast */
        fetchSpotify({
          variables: {
            input: { podcast: preview, offset },
          },
        }),
        /* Fetching existing podcast */
        getPodcast({
          variables: {
            input: { podcast: preview },
          },
        }),
      ]).then((result) => {
        if (!result[1].data) {
          dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_DISPLAY,
            payload: { submit: true },
          });

          dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_CURRENT_PODCAST,
            payload: { bgColor: "rgb(16,16,16)", category: "" },
          });
        } else {
          dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_CURRENT_PODCAST,
            payload: {
              bgColor: result[1].data.getPodcast?.backgroundColor,
              title: result[1].data.getPodcast?.title,
              image: result[1].data.getPodcast?.imageUrl,
            },
          });
        }
        const fetchedSpotifyName = result[0].data.fetchSpotifyPodcast[0].name;
        if (!existingPodcast) {
          setDisplayScrub(true);
        }

        if (!existingPodcast && state.text === state.podcast) {
          dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_DISPLAY,
            payload: { submit: false },
          });
        }

        if (!existingPodcast && state.display.submit) {
          dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_DISPLAY,
            payload: { submit: true },
          });
        }

        /* Register string match as existing podcast */
        if (podcastTitleList.includes(fetchedSpotifyName)) {
          const result = getPodcast({
            variables: {
              input: { podcast: fetchedSpotifyName },
            },
          });
          result.then((fetchData) => {
            const currentPodcastData = fetchData?.data.getPodcast;

            dispatch({
              type: REDUCER_ACTION_TYPE.UPDATE_CURRENT_PODCAST,
              payload: {
                bgColor: currentPodcastData.backgroundColor,
              },
            });
          });

          fetchCategory({
            variables: {
              input: { podcast: fetchedSpotifyName },
            },
          }).then((fetchData) => {
            dispatch({
              type: REDUCER_ACTION_TYPE.UPDATE_CURRENT_PODCAST,
              payload: {
                category: fetchData?.data.fetchCategory,
              },
            });
          });
          dispatch({
            type: REDUCER_ACTION_TYPE.UPDATE_DISPLAY,
            payload: { submit: false, category: true },
          });
        }
      });
      await refetchSpotify();
      await refetchPodcasts();
    } catch (error) {
      console.log(error);
    }
  };

  const spotifyPodcast = {
    spotifyImage: spotifyData?.fetchSpotifyPodcast[0]?.images[0].url,
    spotifyName: spotifyData?.fetchSpotifyPodcast[0]?.name,
    spotifyPublisher: spotifyData?.fetchSpotifyPodcast[0]?.publisher,
    spotifyDescription: spotifyData?.fetchSpotifyPodcast[0]?.description,
    spotifyExternalUrl:
      spotifyData?.fetchSpotifyPodcast[0].external_urls.spotify,
  };

  const handleSave = async () => {
    /* Add to database */
    try {
      await createPodcast({
        variables: {
          input: {
            category: state.category,
            backgroundColor: state.extractedColor,
            podcast: spotifyPodcast.spotifyName,
            image: spotifyPodcast.spotifyImage,
            publisher: spotifyPodcast.spotifyPublisher,
            description: spotifyPodcast.spotifyDescription,
            externalUrl: spotifyPodcast.spotifyExternalUrl,
          },
        },
      });

      dispatch({
        type: REDUCER_ACTION_TYPE.UPDATE_DISPLAY,
        payload: {
          image: false,
          title: false,
          submit: false,
          updateColor: false,
          sponsor: false,
        },
      });

      dispatch({ type: REDUCER_ACTION_TYPE.RESET_FIELDS });

      await refetchPodcasts();
      await refetchSpotify();

      toast({
        title: "Success.",
        description: "Podcast added successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      if (!state.category) {
        toast({
          title: "Error",
          description: "Please Enter Category.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else console.log(error);
    }
  };

  const handleUpdateColor = async () => {
    await updateColor({
      variables: {
        input: {
          backgroundColor: state.extractedColor,
          podcast: state.podcast,
        },
      },
    });
    await refetchPodcasts();
    await refetchCurrentPodcast();

    toast({
      title: "Success.",
      description: "Color Updated.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDeletePodcast = async () => {
    onClose();
    try {
      await deletePodcast({
        variables: {
          input: { podcast: state.podcast },
        },
      });
      dispatch({
        type: REDUCER_ACTION_TYPE.UPDATE_DISPLAY,
        payload: {
          image: false,
          title: false,
          submit: false,
          sponsor: false,
        },
      });

      dispatch({ type: REDUCER_ACTION_TYPE.RESET_FIELDS });
      refetchPodcasts();
      refetchSpotify();
      toast({
        title: "Success.",
        description: "Deleted.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleDetails = async () => {
    onOpenDetails();
    try {
    } catch (err) {
      console.log(err);
    }
  };
  const gradientStyle = {
    backgroundImage: `linear-gradient(to bottom, ${
      state.currentPodcast.bgColor
        ? state.currentPodcast.bgColor
        : state.extractedColor
    }, #101010)`,
  };

  return (
    <div className="bg-[#101010] relative top-[200px] h-screen w-full flex flex-col items-center justify-center overflow-y-visible">
      <DeleteModal
        isOpen={isOpen}
        onClose={onClose}
        handleDeletePodcast={handleDeletePodcast}
      />
      <EditModal
        isOpen={isOpenDetails}
        onClose={onCloseDetails}
        podcastTitle={state.currentPodcast.title}
        refetch={refetchPodcasts}
      />
      <EditPodcastCategory
        isOpen={isOpenEditCategory}
        onClose={onCloseEditCategory}
        onOpen={onOpenEditCategory}
        podcastTitle={state.currentPodcast.title}
        oldCategory={state.currentPodcast.category}
        state={state}
        dispatch={dispatch}
        refetchCurrentPodcast={refetchCurrentPodcast}
      />

      {/* Theme Preview */}
      {spotifyPodcast.spotifyName && state.display.title && (
        <div className="bg-[#101010] fixed w-full h-[320px] top-[170px] z-1">
          <div
            className="w-full h-[260px] fixed z-10"
            style={gradientStyle}
          ></div>
        </div>
      )}

      {/* Title */}
      <h1 className="text-white absolute font-extrabold top-[-180px] text-3xl sm:text-4xl lg:text-5xl mb-4 ">
        {state.isExistingPodcast && state.display.title
          ? state.currentPodcast.title
          : spotifyPodcast.spotifyName &&
            state.display.title &&
            spotifyPodcast.spotifyName}
      </h1>
      {/* Category */}

      <div className="flex w-full relative items-center justify-center">
        {spotifyPodcast.spotifyName &&
          state.display.title &&
          !state.display.submit && (
            <h2 className="text-white absolute flex items-center gap-5 font-semibold top-[-115px] text-lg sm:text-2xl lg:text-xl mb-4 ">
              {capitalizeString(state.currentPodcast.category)}
              <AiFillEdit
                onClick={onOpenEditCategory}
                className="cursor-pointer"
              />
            </h2>
          )}
      </div>

      {/* Image Color Extraction */}
      {state.podcast && (
        <div
          onClick={() =>
            dispatch({
              type: REDUCER_ACTION_TYPE.UPDATE_CURRENT_PODCAST,
              payload: { bgColor: state.extractedColor },
            })
          }
        >
          <Extractor
            image={
              state.isExistingPodcast
                ? state.currentPodcast.image
                : spotifyPodcast.spotifyImage
            }
            dispatch={dispatch}
          />
        </div>
      )}

      <form
        onSubmit={(e) => handleSelectPodcast(e, state.text, false, 0)}
        className="w-[500px] flex flex-col justify-center items-center mb-4 h-[500px]"
      >
        {state.display.submit ||
          (state.isExistingPodcast && (
            <Tooltip label="Edit Offer" placement={"end"}>
              <div
                className="relative w-fit  text-white z-1 hover:cursor-pointer"
                onClick={() => handleDetails()}
              >
                <p className="font-bold mt-2">Edit Offer</p>
              </div>
            </Tooltip>
          ))}
        <VStack spacing={5} className="h-full">
          <div className="flex-col h-[80px] items-center justify-center text-center ">
            <div className="flex gap-2 justify-center w-full mt-10">
              <Input
                type="text"
                value={state.text}
                w={200}
                color={"white"}
                placeholder={"Search Podcast Title"}
                onChange={(e) => handlePodcastInputChange(e)}
                zIndex={10}
              />
            </div>
            {displayScrub && (
              <Button
                colorScheme="black"
                className="relative bottom-10 left-[180px] active:scale-95"
                onClick={(e) => {
                  setOffset((prev) => prev + 1);
                  handleSelectPodcast(e, state.text, false, offset);
                }}
              >
                NEXT
              </Button>
            )}
            {displayScrub && (
              <Button
                colorScheme="black"
                className="relative bottom-10 right-[180px] active:scale-95"
                onClick={(e) => {
                  setOffset((prev) => prev - 1);
                  handleSelectPodcast(e, state.text, false, offset);
                }}
              >
                PREV
              </Button>
            )}
            <div className="w-[300px] bg-[#12121] flex flex-col items-center mt-10">
              <ul className="text-center">
                {state.text &&
                  state.display.preview &&
                  fusePreview?.map((preview: string) => (
                    <li key={preview}>
                      <Button
                        onClick={(e) =>
                          handleSelectPodcast(e, preview, true, 0)
                        }
                        margin={1}
                      >
                        {preview}
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {state.display.sponsor && state.podcast ? (
            <CreateSponsor
              podcast={
                state.isExistingPodcast && state.display.title
                  ? state.currentPodcast.title
                  : spotifyPodcast.spotifyName &&
                    state.display.title &&
                    spotifyPodcast.spotifyName
              }
              spotifyPodcast={spotifyPodcast}
              backgroundColor={state.extractedColor}
              refetchPodcast={refetchCurrentPodcast}
            />
          ) : null}

          {state.display.sponsor &&
            !state.display.submit &&
            state.display.updateColor && (
              <Button onClick={handleUpdateColor}>Update Color</Button>
            )}
          {state.display.sponsor &&
            !state.display.submit &&
            state.display.updateColor && (
              <Button colorScheme={"red"} onClick={onOpen}>
                Delete Podcast
              </Button>
            )}
          {state.display.submit && (
            <SelectCategory state={state} dispatch={dispatch} />
          )}
          {state.display.submit && (
            <Button
              onClick={handleSave}
              colorScheme={"purple"}
              w={"300px"}
              mt={10}
              p={4}
            >
              Add to Database
            </Button>
          )}
        </VStack>
      </form>
    </div>
  );
};

export default App;
