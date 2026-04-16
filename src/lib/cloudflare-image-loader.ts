/**
 * Cloudflare Images loader for next/image.
 * Bug #21 fix: replace unoptimized:true with CF Images resize service.
 *
 * Prerequisites:
 *   1. Enable Cloudflare Images on your zone in the CF dashboard.
 *   2. Set NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH in your environment.
 *
 * Cloudflare Images resize URL format:
 *   https://imagedelivery.net/{accountHash}/{imageId}/width={w},quality={q}
 *
 * For proxied assets (non-CF Images), falls back to the original src with
 * Cloudflare's /cdn-cgi/image/ resize endpoint which is available on Pro+ plans.
 */
export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const q = quality ?? 80;

  // If the src is already a full URL to CF Images delivery network, pass through.
  if (src.startsWith('https://imagedelivery.net/')) {
    return `${src}/width=${width},quality=${q}`;
  }

  // For local /public assets and same-origin images, use CF's cdn-cgi resize proxy.
  // This requires Cloudflare Polish / Image Resizing to be enabled on the zone.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wealix.app';
  const absoluteSrc = src.startsWith('http') ? src : `${origin}${src}`;
  return `${origin}/cdn-cgi/image/width=${width},quality=${q},format=auto/${absoluteSrc}`;
}
