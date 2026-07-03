import Image from "next/image";

/**
 * Responsive brand logo.
 *
 * Both mobile (< md) and desktop (≥ md) use the SAME square brand lockup
 * (open book + finger-heart + "Kutty Story" wordmark) from /KuttyStoryLogo.png
 * — the same asset used for the favicon / OG / PWA icons, so the brand is
 * consistent everywhere. (Previously desktop showed a separate horizontal
 * lockup, KuttyStoryFullLogo.png; that's been retired.)
 *
 * Two <Image> elements are kept only so each breakpoint can carry a STATIC
 * Tailwind height class (dynamic `md:` prefixes don't survive JIT). Sizing is
 * driven by the height utility (w-auto + object-contain) so the square renders
 * cleanly. Pass `className` to override heights per placement.
 */
export function Logo({
  className = "",
  desktopHeightClass = "h-12",
  mobileHeightClass = "h-10",
}: {
  className?: string;
  desktopHeightClass?: string;
  mobileHeightClass?: string;
}) {
  return (
    <>
      <Image
        src="/KuttyStoryLogo.png"
        alt="Kutty Story"
        width={1080}
        height={1080}
        priority
        className={`hidden md:block w-auto object-contain ${desktopHeightClass} ${className}`}
      />
      <Image
        src="/KuttyStoryLogo.png"
        alt="Kutty Story"
        width={1080}
        height={1080}
        className={`block md:hidden w-auto object-contain ${mobileHeightClass} ${className}`}
      />
    </>
  );
}
