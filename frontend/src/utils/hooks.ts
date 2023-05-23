import {
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export const useMediaQuery = (width: number) => {
  const [targetReached, setTargetReached] = useState(false);
  const updateTarget = useCallback((e: any) => {
    if (e.matches) {
      setTargetReached(true);
    } else {
      setTargetReached(false);
    }
  }, []);

  if (typeof window !== "undefined") {
    useLayoutEffect(() => {
      const media = window.matchMedia(`(max-width: ${width}px)`);
      media.addEventListener("change", updateTarget);

      // Check on mount (callback is not called until a change occurs)

      if (media.matches) {
        setTargetReached(true);
      } else {
        setTargetReached(false);
      }

      return () => media.removeEventListener("change", updateTarget);
    }, []);
  }

  return targetReached;
};

import { NextRouter, useRouter } from "next/router";
import { CurrentPage, NavContext } from "../context/navContext";

export const useSetCurrentPage = (currentPage: CurrentPage) => {
  const { setCurrentPage } = NavContext();

  useEffect(() => {
    setCurrentPage((prev) => ({
      ...prev,
      home: currentPage.home,
      podcasts: currentPage.podcasts,
      search: currentPage.search,
      offers: currentPage.offers,
    }));
  }, [setCurrentPage]);
};

export const useLoadingScreen = () => {
  const router = useRouter();
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, []);

  return isLoading;
};

export const useCarouselSpeed = (
  clickCount: number,
  startTime: number,
  setNinjaMode: React.Dispatch<React.SetStateAction<boolean>>
) => {
  useEffect(() => {
    if (clickCount > 1) {
      const elapsedTime = Date.now() - startTime;
      const clickSpeed = clickCount / (elapsedTime / 1000);

      if (clickSpeed >= 3 && clickCount > 6) {
        setNinjaMode(true);
      }
    }
  }, [clickCount, startTime]);
};

type RotateDirection = "next" | "prev";

export type HandleRotate = (direction: RotateDirection) => void;

export const useRotate = (
  clickCount: number,
  setClickCount: React.Dispatch<React.SetStateAction<number>>,
  setStartTime: React.Dispatch<React.SetStateAction<number>>
): [number, HandleRotate] => {
  const [currDeg, setCurrDeg] = useState(0);
  const [rotateDirection, setRotateDirection] =
    useState<RotateDirection>("next");

  const handleRotate: HandleRotate = (direction) => {
    setClickCount((prev) => prev + 1);

    if (clickCount === 0) {
      setStartTime(Date.now());
    }

    if (rotateDirection !== direction) {
      setClickCount(0);
      setStartTime(Date.now());
    }

    if (direction === "next") {
      setCurrDeg(currDeg + 45);
      setRotateDirection("next");
    } else if (direction === "prev") {
      setCurrDeg(currDeg - 45);
      setRotateDirection("prev");
    }
  };

  return [currDeg, handleRotate];
};

const useSlider = (slider: HTMLDivElement | null, scrollDistance: number) => {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    const cardWidth = 250;
    if (slider) {
      const { scrollWidth, scrollLeft, clientWidth } = slider;
      const scrollPosition = scrollLeft + clientWidth;
      setShowLeftArrow(scrollLeft >= cardWidth);
      setShowRightArrow(scrollPosition < scrollWidth - cardWidth);
    }
  };

  const slideTopPicks = (direction: string) => {
    if (slider) {
      if (direction === "left") {
        slider.scrollLeft -= scrollDistance;
      } else if (direction === "right") {
        slider.scrollLeft += scrollDistance;
      }
    }
  };

  useEffect(() => {
    if (slider) {
      slider.addEventListener("scroll", () => handleScroll());
      return () => slider.removeEventListener("scroll", () => handleScroll());
    }
  }, [slider]);

  return { showLeftArrow, showRightArrow, slideTopPicks };
};

export default useSlider;

export const useHoverCard = () => {
  const isBreakPoint = useMediaQuery(1023);
  const [activeIndex, setActiveIndex] =
    useState<SetStateAction<number | null>>(null);
  let timerId: NodeJS.Timeout;

  const handleHoverCard = async (index: number, event: string) => {
    if (!isBreakPoint) {
      clearTimeout(timerId);
      if (event == "mouseenter" && !activeIndex) {
        timerId = setTimeout(() => {
          setActiveIndex(index);
        }, 600);
      }
      if (event === "mouseleave") {
        clearTimeout(timerId);
      }
    }
  };

  return { handleHoverCard, setActiveIndex, activeIndex };
};

export const useScrollRestoration = (router: NextRouter) => {
  useEffect(() => {
    const handleRouteChange = () => {
      window.history.scrollRestoration = "manual";
    };
    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, []);
};

export const useBanner = (
  bannerBreakpointRef: RefObject<HTMLDivElement>,
  breakpoint: number
) => {
  const [banner, setBanner] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (bannerBreakpointRef.current) {
        const elementRect = bannerBreakpointRef.current.getBoundingClientRect();
        const isPastElement = elementRect.bottom <= breakpoint;
        setBanner(isPastElement);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [banner]);

  return { banner };
};
