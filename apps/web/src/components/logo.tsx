import Image from 'next/image';

/**
 * Responsive brand logo.
 * - Tablet / laptop / desktop (≥ md): the full horizontal lockup
 *   (book icon + "Kutty Story" wordmark) from /KuttyStoryFullLogo.png.
 * - Mobile (< md): the compact square lockup (book + heart + "Kutty Story")
 *   from /KuttyStorySquareLogo.png.
 *
 * Sizing is driven by height utility classes (w-auto) so either aspect ratio
 * renders cleanly. Pass `className` to override the heights per placement.
 */
export function Logo({
  className = '',
  desktopHeightClass = 'h-12',
  mobileHeightClass = 'h-10',
}: {
  className?: string;
  desktopHeightClass?: string;
  mobileHeightClass?: string;
}) {
  return (
    <>
      <Image
        src="/KuttyStoryFullLogo.png"
        alt="Kutty Story"
        width={260}
        height={64}
        className={`hidden md:block w-auto object-contain ${desktopHeightClass} ${className}`}
      />
      <Image
        src="/KuttyStorySquareLogo.png"
        alt="Kutty Story"
        width={48}
        height={48}
        className={`block md:hidden w-auto object-contain ${mobileHeightClass} ${className}`}
      />
    </>
  );
}
