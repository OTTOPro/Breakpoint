#!/usr/bin/env node
/**
 * Rasterise the BreakPoint app mark (from Claude Design "BreakPoint Logo.dc.html")
 * into the PNG slots Expo needs. Vector → PNG via sharp.
 *
 *   node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'mobile', 'assets', 'images');
const TILE = '#212529';

/** The flag-at-the-meeting-point artwork (viewBox 0 0 1024 1024). */
function artwork({ mono = false } = {}) {
  if (mono) {
    return `
      <ellipse cx="512" cy="716" rx="216" ry="56" fill="none" stroke="#FBFBFC" stroke-width="11" opacity="0.4"/>
      <ellipse cx="512" cy="716" rx="288" ry="75" fill="none" stroke="#FBFBFC" stroke-width="10" opacity="0.22"/>
      <ellipse cx="512" cy="716" rx="360" ry="94" fill="none" stroke="#FBFBFC" stroke-width="9" opacity="0.12"/>
      <ellipse cx="512" cy="716" rx="150" ry="39" fill="#F4F5F6"/>
      <ellipse cx="512" cy="716" rx="30" ry="11" fill="#212529"/>
      <path d="M523,236 C648,219 752,272 832,350 C751,430 675,391 604,443 C569,469 549,467 523,465 Z" fill="#FBFBFC"/>
      <rect x="505" y="214" width="17" height="514" rx="8.5" fill="#FBFBFC"/>
      <circle cx="513.5" cy="214" r="13" fill="#FBFBFC"/>`;
  }
  return `
    <ellipse cx="512" cy="716" rx="216" ry="56" fill="none" stroke="#ED93B1" stroke-width="11" opacity="0.55"/>
    <ellipse cx="512" cy="716" rx="288" ry="75" fill="none" stroke="#CECBF6" stroke-width="10" opacity="0.34"/>
    <ellipse cx="512" cy="716" rx="360" ry="94" fill="none" stroke="#C7DBE2" stroke-width="9" opacity="0.2"/>
    <ellipse cx="512" cy="716" rx="150" ry="39" fill="#F4F5F6"/>
    <ellipse cx="512" cy="716" rx="30" ry="11" fill="#212529"/>
    <path d="M523,236 C648,219 752,272 832,350 C751,430 675,391 604,443 C569,469 549,467 523,465 Z" fill="#ED93B1"/>
    <rect x="505" y="214" width="17" height="514" rx="8.5" fill="#FBFBFC"/>
    <circle cx="513.5" cy="214" r="13" fill="#FBFBFC"/>`;
}

const svg = (inner, size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`;

// Opaque tile (background rect baked in).
const tileSvg = (size, opts) =>
  svg(`<rect width="1024" height="1024" fill="${TILE}"/>${artwork(opts)}`, size);

// Transparent artwork (for adaptive foreground / splash over a colour).
const fgSvg = (size, opts) => svg(artwork(opts), size);

// Adaptive foreground: artwork recentred + scaled into the safe zone.
const adaptiveFgSvg = (size) =>
  svg(
    `<g transform="translate(512 512) scale(0.62) translate(-512 -505.5)">${artwork()}</g>`,
    size,
  );

const solidSvg = (size, color) =>
  svg(`<rect width="1024" height="1024" fill="${color}"/>`, size);

async function png(svgStr, file, { flatten = false } = {}) {
  let img = sharp(Buffer.from(svgStr)).png();
  if (flatten) img = img.flatten({ background: TILE }); // strip alpha (iOS requirement)
  await img.toFile(join(OUT, file));
  const meta = await sharp(join(OUT, file)).metadata();
  console.log(`✔ ${file}  ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}`);
}

await png(tileSvg(1024), 'icon.png', { flatten: true }); // iOS + default, NO alpha
await png(adaptiveFgSvg(1024), 'android-icon-foreground.png'); // transparent
await png(solidSvg(1024, TILE), 'android-icon-background.png'); // solid tile
await png(fgSvg(1024, { mono: true }), 'android-icon-monochrome.png'); // themed
await png(fgSvg(1024), 'splash-icon.png'); // transparent, shown over tile bg
await png(tileSvg(196), 'favicon.png', { flatten: true }); // web/PWA

console.log('done.');
