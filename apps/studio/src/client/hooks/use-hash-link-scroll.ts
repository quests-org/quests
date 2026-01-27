import { useCallback } from "react";

export const useHashLinkScroll = () => {
  const handleHashLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const href = event.currentTarget.getAttribute("href");
      if (href?.startsWith("#")) {
        // Find the root element to search within (walk up to find a scroll container first)
        let searchRoot: Document | Element = event.currentTarget;
        let tempParent = event.currentTarget.parentElement;
        while (tempParent && tempParent !== document.body) {
          const style = window.getComputedStyle(tempParent);
          const overflowY = style.overflowY;
          if (overflowY === "auto" || overflowY === "scroll") {
            searchRoot = tempParent;
            break;
          }
          tempParent = tempParent.parentElement;
        }
        if (searchRoot === event.currentTarget) {
          searchRoot = document;
        }

        const element =
          searchRoot instanceof Document
            ? searchRoot.querySelector(href)
            : searchRoot.querySelector(href);
        if (element) {
          // Find the nearest scrollable ancestor by checking computed styles
          let scrollContainer = element.parentElement;
          while (scrollContainer && scrollContainer !== document.body) {
            const style = window.getComputedStyle(scrollContainer);
            const overflowY = style.overflowY;
            // Check if element has overflow auto/scroll (even if not currently scrollable)
            if (overflowY === "auto" || overflowY === "scroll") {
              break;
            }
            scrollContainer = scrollContainer.parentElement;
          }

          if (scrollContainer && scrollContainer !== document.body) {
            // Get element position relative to scroll container
            const elementRect = element.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
            const relativeTop = elementRect.top - containerRect.top;
            const scrollOffset = scrollContainer.scrollTop;

            scrollContainer.scrollTo({
              behavior: "smooth",
              top: scrollOffset + relativeTop,
            });
          } else {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }
    },
    [],
  );

  return handleHashLinkClick;
};
