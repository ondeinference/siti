/**
 * Official App Store and Play Store badges.
 * Links to download Siti AI from each platform.
 */

export function StoreBadges() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <a
        href="https://apps.apple.com/se/app/siti-ai/id6780047972"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80"
        aria-label="Download Siti AI on the App Store"
      >
        <svg
          viewBox="0 0 120 40"
          width="120"
          height="40"
          className="h-10 w-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* App Store badge background */}
          <rect width="120" height="40" rx="6" fill="black" />
          {/* Apple logo */}
          <path
            d="M14.5 12c-.5 0-1 .3-1.2.8l-4 9.4c-.2.5 0 1 .5 1.2.5.2 1 0 1.2-.5l.8-2h4l.8 2c.2.5.7.7 1.2.5.5-.2.7-.7.5-1.2l-4-9.4c-.2-.5-.7-.8-1.2-.8zm-1.2 6h2.4l-1.2-2.8-1.2 2.8zm8.8-6c-.6 0-1 .4-1 1v8c0 .6.4 1 1 1s1-.4 1-1v-8c0-.6-.4-1-1-1zm6 0c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8-6c-.6 0-1 .4-1 1v4.5c0 1.4-1.1 2.5-2.5 2.5S32 17.4 32 16v-4c0-.6-.4-1-1-1s-1 .4-1 1v4c0 2.5 2 4.5 4.5 4.5S39 18.5 39 16v-4c0-.6-.4-1-1-1zm8-6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
            fill="white"
          />
          {/* Text */}
          <text
            x="60"
            y="22"
            fontFamily="system-ui, sans-serif"
            fontSize="9"
            fontWeight="500"
            fill="white"
            textAnchor="middle"
          >
            Download on the
          </text>
          <text
            x="60"
            y="32"
            fontFamily="system-ui, sans-serif"
            fontSize="12"
            fontWeight="600"
            fill="white"
            textAnchor="middle"
          >
            App Store
          </text>
        </svg>
      </a>

      <a
        href="https://play.google.com/store/apps/details?id=ai.siti.Siti"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80"
        aria-label="Download Siti AI on Google Play"
      >
        <svg
          viewBox="0 0 135 40"
          width="135"
          height="40"
          className="h-10 w-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Play Store badge background */}
          <rect width="135" height="40" rx="6" fill="black" />
          {/* Google Play badge icon */}
          <path
            d="M18 10L35 26l-17 16V10z"
            fill="#3DDC84"
          />
          <path
            d="M18 10l8.5 8.5-8.5 8.5V10z"
            fill="#17A948"
          />
          <path
            d="M26.5 18.5L35 26l-8.5-7.5z"
            fill="#3DDC84"
          />
          {/* Text */}
          <text
            x="68"
            y="17"
            fontFamily="system-ui, sans-serif"
            fontSize="8"
            fontWeight="500"
            fill="white"
            textAnchor="start"
          >
            GET IT ON
          </text>
          <text
            x="68"
            y="30"
            fontFamily="system-ui, sans-serif"
            fontSize="13"
            fontWeight="600"
            fill="white"
            textAnchor="start"
          >
            Google Play
          </text>
        </svg>
      </a>
    </div>
  );
}
