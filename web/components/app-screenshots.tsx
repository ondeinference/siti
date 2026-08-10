"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Shot = {
  src: string;
  alt: string;
  caption: string;
  device: "phone" | "tablet" | "desktop";
  width: number;
  height: number;
};

const slides: Shot[] = [
  {
    src: "/screenshots/iphone-chat.png",
    alt: "Siti AI chat running on iPhone",
    caption: "Ask anything, on device",
    device: "phone",
    width: 1242,
    height: 2688,
  },
  {
    src: "/screenshots/iphone-settings.png",
    alt: "Siti AI on-device model settings on iPhone",
    caption: "Pick your model",
    device: "phone",
    width: 1242,
    height: 2688,
  },
  {
    src: "/screenshots/ipad-chat.png",
    alt: "Siti AI chat running on iPad",
    caption: "Roomy on iPad",
    device: "tablet",
    width: 2064,
    height: 2752,
  },
  {
    src: "/screenshots/ipad-settings.png",
    alt: "Siti AI on-device model settings on iPad",
    caption: "Everything stays local",
    device: "tablet",
    width: 2064,
    height: 2752,
  },
  {
    src: "/screenshots/windows-chat.png",
    alt: "Siti AI chat running on Windows",
    caption: "Now on Windows",
    device: "desktop",
    width: 1920,
    height: 1080,
  },
  {
    src: "/screenshots/windows-private.png",
    alt: "Siti AI private, on-device settings on Windows",
    caption: "Private on your PC",
    device: "desktop",
    width: 1920,
    height: 1080,
  },
  {
    src: "/screenshots/windows-draft.png",
    alt: "Siti AI drafting and summarizing on Windows",
    caption: "Draft and summarize",
    device: "desktop",
    width: 1920,
    height: 1080,
  },
  {
    src: "/screenshots/windows-offline.png",
    alt: "Siti AI working offline on Windows",
    caption: "Works offline",
    device: "desktop",
    width: 1920,
    height: 1080,
  },
  {
    src: "/screenshots/windows-model.png",
    alt: "Siti AI on-device model picker on Windows",
    caption: "Choose your model",
    device: "desktop",
    width: 1920,
    height: 1080,
  },
];

const AUTOPLAY_MS = 5000;
const SWIPE_THRESHOLD = 40;

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}

export function AppScreenshots() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = slides.length;
  const goTo = useCallback(
    (next: number) => setIndex((next + count) % count),
    [count]
  );
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  // The stage frame is sized per the active slide: portrait phone/tablet
  // shots want a tall narrow box, landscape desktop shots want a wide
  // short one, so both fill the frame without letterboxing or clipping.
  const isDesktop = slides[index].device === "desktop";

  // Auto-advance, paused on hover/focus and when the user prefers reduced motion.
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      AUTOPLAY_MS
    );
    return () => window.clearInterval(id);
  }, [paused, count]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD) prev();
    else if (delta < -SWIPE_THRESHOLD) next();
    touchStartX.current = null;
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">
          A look inside
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Private by design, on every device.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          The same assistant on iPhone, iPad, and Windows. Your model runs
          locally and your chats never leave the device.
        </p>
      </div>

      <div
        className="mt-12"
        role="group"
        aria-roledescription="carousel"
        aria-label="App screenshots"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") prev();
          if (e.key === "ArrowRight") next();
        }}
      >
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous screenshot"
            className="hidden shrink-0 rounded-full border border-border bg-surface p-3 text-muted shadow-sm transition-colors hover:text-ink sm:block"
          >
            <Arrow dir="left" />
          </button>

          {/* Stage: a fixed-height frame so slides of the same orientation
              swap without the layout jumping. Widens and flattens for the
              landscape Windows shots instead of letterboxing them. */}
          <div
            className={`relative w-full overflow-hidden transition-[max-width] duration-300 ${
              isDesktop
                ? "h-[220px] max-w-2xl sm:h-[400px]"
                : "h-[460px] max-w-md sm:h-[600px]"
            }`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex h-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {slides.map((shot, i) => (
                <figure
                  key={shot.src}
                  className="flex h-full w-full shrink-0 flex-col items-center justify-center"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  aria-hidden={i !== index}
                >
                  <div
                    className="flex min-h-0 flex-1 items-center justify-center"
                    style={{
                      maxWidth:
                        shot.device === "phone"
                          ? 260
                          : shot.device === "tablet"
                            ? 420
                            : 640,
                    }}
                  >
                    <Image
                      src={shot.src}
                      alt={shot.alt}
                      width={shot.width}
                      height={shot.height}
                      priority={i === 0}
                      sizes="(max-width: 640px) 90vw, 420px"
                      className="h-full w-auto rounded-card border border-border bg-surface object-contain shadow-sm"
                    />
                  </div>
                  <figcaption className="mt-4 text-center text-sm text-muted">
                    {shot.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Next screenshot"
            className="hidden shrink-0 rounded-full border border-border bg-surface p-3 text-muted shadow-sm transition-colors hover:text-ink sm:block"
          >
            <Arrow dir="right" />
          </button>
        </div>

        {/* Dots */}
        <div className="mt-6 flex items-center justify-center gap-2.5">
          {slides.map((shot, i) => (
            <button
              key={shot.src}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to ${shot.caption}`}
              aria-current={i === index}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-brand" : "w-2 bg-border hover:bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
