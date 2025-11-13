const DEFAULT_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc/files';

const fonts = [
  {
    family: 'Noto Sans SC',
    weight: 400,
    file: 'noto-sans-sc-chinese-simplified-400-normal.woff2',
    format: 'woff2'
  },
  {
    family: 'Noto Sans SC',
    weight: 600,
    file: 'noto-sans-sc-chinese-simplified-600-normal.woff2',
    format: 'woff2'
  }
] as const;

let cached: string | null = null;

async function loadFont(font: (typeof fonts)[number]) {
  const buffer = await fetchFontFromCDN(font.file);
  return `@font-face { font-family: '${font.family}'; font-weight: ${font.weight}; font-style: normal; font-display: swap; src: url(data:font/${font.format};base64,${buffer.toString('base64')}) format('${font.format}'); }`;
}

export async function getFontFaceCSS() {
  if (cached) return cached;
  const blocks = await Promise.all(fonts.map((font) => loadFont(font)));
  cached = blocks.join('\n');
  return cached;
}

async function fetchFontFromCDN(file: string) {
  const base = process.env.FONT_CDN_BASE?.replace(/\/$/, '') ?? DEFAULT_CDN_BASE;
  const url = `${base}/${file}`;
  const response = await fetch(url, {
    cache: 'force-cache',
    next: { revalidate: 86_400 }
  });
  if (!response.ok) {
    throw new Error(`无法从 CDN 加载字体：${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
