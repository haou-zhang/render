import { readFile } from 'node:fs/promises';
import path from 'node:path';

const fonts = [
  {
    family: 'AlibabaPuHuiTi',
    weight: 400,
    file: 'Fonts/AlibabaPuHuiTi-3-55-Regular/AlibabaPuHuiTi-3-55-Regular.woff2',
    format: 'woff2'
  },
  {
    family: 'AlibabaPuHuiTi',
    weight: 600,
    file: 'Fonts/AlibabaPuHuiTi-3-75-SemiBold/AlibabaPuHuiTi-3-75-SemiBold.woff2',
    format: 'woff2'
  }
];

let cached: string | null = null;

async function loadFont(font: (typeof fonts)[number]) {
  const filePath = path.join(process.cwd(), font.file);
  const buffer = await readFile(filePath);
  return `@font-face { font-family: '${font.family}'; font-weight: ${font.weight}; font-style: normal; font-display: swap; src: url(data:font/${font.format};base64,${buffer.toString('base64')}) format('${font.format}'); }`;
}

export async function getFontFaceCSS() {
  if (cached) return cached;
  const blocks = await Promise.all(fonts.map((font) => loadFont(font)));
  cached = blocks.join('\n');
  return cached;
}
