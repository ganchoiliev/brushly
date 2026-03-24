/**
 * Tiny SVG blur placeholder for Next.js Image components.
 * Used with placeholder="blur" + blurDataURL for remote images.
 * Creates a dark-themed blur-up effect matching the Brushly palette.
 */

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2D2D2D"/><stop offset="50%" stop-color="#1A1A1A"/><stop offset="100%" stop-color="#2D2D2D"/></linearGradient></defs><rect width="40" height="40" fill="#1A1A1A"/><rect width="40" height="40" fill="url(#g)" opacity="0.5"/></svg>`

export const blurDataURL = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`
