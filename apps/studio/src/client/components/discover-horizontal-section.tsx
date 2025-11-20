import { InternalLink } from "@/client/components/internal-link";
import { RegistryAppCard } from "@/client/components/registry-app-card";
import { type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DiscoverHorizontalSectionProps {
  category: "apps" | "templates";
  description: string;
  items: { folderName: string }[];
  showIcon?: boolean;
  title: string;
  viewAllHref: LinkProps["to"];
}

export function DiscoverHorizontalSection({
  category,
  description,
  items,
  showIcon = true,
  title,
  viewAllHref,
}: DiscoverHorizontalSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth);
  };

  useEffect(() => {
    checkScroll();
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      return () => {
        container.removeEventListener("scroll", checkScroll);
      };
    }
    return;
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const cards = el.querySelectorAll("[data-card]");
    if (cards.length === 0) {
      return;
    }

    const containerRect = el.getBoundingClientRect();
    const containerLeft = containerRect.left;
    const containerRight = containerRect.right;

    const visibleCards: Element[] = [];
    const fullyVisibleCards: Element[] = [];

    for (const card of cards) {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.right > containerLeft && cardRect.left < containerRight) {
        visibleCards.push(card);
        if (
          cardRect.left >= containerLeft &&
          cardRect.right <= containerRight
        ) {
          fullyVisibleCards.push(card);
        }
      }
    }

    if (visibleCards.length === 0) {
      return;
    }

    let targetCardIndex: number;

    if (direction === "right") {
      // Find the index of the last fully visible card and scroll to show the next set
      const lastFullyVisibleCard = fullyVisibleCards.at(-1);
      if (!lastFullyVisibleCard) {
        return;
      }
      const lastFullyVisibleIndex = [...cards].indexOf(lastFullyVisibleCard);
      targetCardIndex = Math.min(lastFullyVisibleIndex + 1, cards.length - 1);
    } else {
      // Find the index of the first fully visible card and scroll to show the previous set
      const firstFullyVisibleCard = fullyVisibleCards[0];
      if (!firstFullyVisibleCard) {
        return;
      }
      const firstFullyVisibleIndex = [...cards].indexOf(firstFullyVisibleCard);
      targetCardIndex = Math.max(firstFullyVisibleIndex - 1, 0);
    }

    const targetCard = cards[targetCardIndex];
    if (!targetCard) {
      return;
    }

    const cardRect = targetCard.getBoundingClientRect();
    const cardOffsetLeft = (targetCard as HTMLElement).offsetLeft;

    // Calculate the scroll position to align the target card with the container edge
    const targetScrollLeft =
      direction === "right"
        ? cardOffsetLeft
        : cardOffsetLeft - el.clientWidth + cardRect.width;

    el.scrollTo({
      behavior: "smooth",
      left: targetScrollLeft,
    });

    setTimeout(checkScroll, 300);
  };

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No {category} available yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <InternalLink
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          to={viewAllHref}
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </InternalLink>
      </div>

      <div className="relative group">
        {canScrollLeft && (
          <button
            aria-label="Scroll left"
            className="absolute left-0 ml-[-1rem] top-[36%] -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg border border-border hover:bg-background transition-all duration-200"
            onClick={() => {
              scroll("left");
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          className="overflow-x-auto scrollbar-hide scroll-smooth"
          ref={containerRef}
          style={{
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <div
            className="flex gap-4 pb-4 pr-6 sm:pr-8 lg:pr-12"
            style={{ width: "max-content" }}
          >
            {items.map((item) => (
              <div
                className="shrink-0 w-64 sm:w-72 lg:w-80"
                data-card
                key={item.folderName}
              >
                <RegistryAppCard
                  category={category}
                  folderName={item.folderName}
                  showIcon={showIcon}
                />
              </div>
            ))}
          </div>
        </div>

        {canScrollRight && (
          <button
            aria-label="Scroll right"
            className="absolute right-0 mr-[-1rem] top-[36%] -translate-y-1/2 z-10 bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg border border-border hover:bg-background transition-all duration-200"
            onClick={() => {
              scroll("right");
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
