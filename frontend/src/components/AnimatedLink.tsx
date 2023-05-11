import Link from "next/link";
import { ReactNode, useState } from "react";
import { MdChevronRight } from "react-icons/md";
import { useMediaQuery } from "../utils/hooks";

interface AnimatedLinkProps {
  title: string | undefined;
  location: string;
  separateLink?: boolean;
}

const ConditionalLink = ({
  children,
  separateLink,
  location,
}: {
  children: ReactNode;
  separateLink: boolean | undefined;
  location: string;
}) => {
  if (separateLink) {
    return <span>{children}</span>;
  } else return <Link href={`/podcasts/${location}`}>{children}</Link>;
};

const AnimatedLink = ({ title, location, separateLink }: AnimatedLinkProps) => {
  const isBreakPoint = useMediaQuery(1023);
  const [hover, setHover] = useState(false);
  if (isBreakPoint) {
    return (
      <div
        className={`flex ${
          separateLink ? "justify-between" : "justify-start"
        } w-full items-center "`}
      >
        <ConditionalLink location={location} separateLink={separateLink}>
          <div className="flex items-center z-10 hover:cursor-pointer py-4">
            <h1
              className={`text-xl lg:text-2xl font-bold px-3 text-[#cdcdcd] relative bottom-[2px] group-hover:text-white whitespace-nowrap`}
            >
              {title}
            </h1>
            {separateLink || (
              <MdChevronRight
                color={"#9c9c9c"}
                size={30}
                className="right-3 relative"
              />
            )}
          </div>
        </ConditionalLink>
        {separateLink && (
          <Link
            href={`/podcasts/${location}`}
            className="flex items-center pr-4"
          >
            <p className="whitespace-nowrap text-sm text-[#9c9c9c] font-bold relative`">
              Explore All
            </p>
            <MdChevronRight color={"#9c9c9c"} size={20} className="relative" />
          </Link>
        )}
      </div>
    );
  } else {
    return (
      <div className="w-full flex items-center justify-between group h-fit hover:cursor-point pt-6">
        <Link href={`/podcasts/${location}`}>
          <div
            className="flex items-center z-10 hover:cursor-pointer mb-4"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            <h1
              className={`text-xl lg:text-2xl font-bold px-3 relative text-[#cdcdcd] bottom-[2px] group-hover:text-white whitespace-nowrap`}
            >
              {title}
            </h1>

            <div className="relative z-0 flex items-center right-5">
              <p
                className={`${
                  hover ? "opacity-100 left-4" : "left-0 opacity-0"
                } transition-all duration-[500ms] ease-in-out  whitespace-nowrap text-xs text-[#9c9c9c] font-bold relative`}
              >
                Explore All
              </p>
              <MdChevronRight
                color={"#9c9c9c"}
                className={`group-hover:block hidden relative ${
                  hover
                    ? "left-4 opacity-100 scale-75"
                    : "scale-100 left-[-60px]"
                } transition-all duration-200 ease-in rounded-full  cursor-pointer `}
                size={30}
              />
            </div>
          </div>
        </Link>
      </div>
    );
  }
};

export default AnimatedLink;
