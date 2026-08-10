import Image from "next/image";

/**
 * Official App Store, Play Store and Microsoft Store badges.
 * Links to download Siti AI from each platform.
 */

export function StoreBadges() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <a
        href="https://apps.apple.com/se/app/siti-ai/id6780047972"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-transform hover:scale-105 hover:opacity-90"
        aria-label="Download on the App Store"
      >
        <Image
          src="/images/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg"
          alt="Download on the App Store"
          width={135}
          height={40}
          className="h-10 w-auto sm:h-[50px]"
        />
      </a>

      <a
        href="https://play.google.com/store/apps/details?id=ai.siti.Siti"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-transform hover:scale-105 hover:opacity-90"
        aria-label="Get it on Google Play"
      >
        <Image
          src="/images/GetItOnGooglePlay_Badge_Web_color_English.png"
          alt="Get it on Google Play"
          width={135}
          height={40}
          className="h-10 w-auto sm:h-[50px]"
        />
      </a>

      <a
        href="https://apps.microsoft.com/detail/9p6tjltzg6mk"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-transform hover:scale-105 hover:opacity-90"
        aria-label="Get it from Microsoft Store"
      >
        <Image
          src="/images/Get_it_from_Microsoft_Store_Badge_en-US_dark.svg"
          alt="Get it from Microsoft Store"
          width={161}
          height={44}
          className="h-10 w-auto sm:h-[50px]"
        />
      </a>
    </div>
  );
}
