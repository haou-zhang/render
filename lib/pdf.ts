import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import puppeteer, { type Browser } from 'puppeteer-core';
import { getLaunchOptions } from './chromium';

let browser: Browser | null = null;

async function getBrowser() {
  if (browser) return browser;
  const options = await getLaunchOptions();
  browser = await puppeteer.launch(options);
  browser.on('disconnected', () => {
    browser = null;
  });
  return browser;
}

interface WatermarkPayload {
  token: string;
  requestId: string;
  userAgent: string;
  ip?: string;
  timestamp: string;
}

export async function htmlToImagePdf(html: string, watermark: WatermarkPayload) {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pngBuffer = (await page.screenshot({ fullPage: true, type: 'png' })) as Buffer;

    const pdfDoc = await PDFDocument.create();
    const png = await pdfDoc.embedPng(pngBuffer);
    const pngDims = png.scale(1);
    const pdfPage = pdfDoc.addPage([pngDims.width, pngDims.height]);
    pdfPage.drawImage(png, { x: 0, y: 0, width: pngDims.width, height: pngDims.height });

    await injectWatermark(pdfDoc, watermark);

    pdfDoc.setTitle('render.messesum.com secure artifact');
    pdfDoc.setAuthor('render.messesum.com');
    pdfDoc.setSubject('Token scoped PDF output');

    return Buffer.from(await pdfDoc.save());
  } finally {
    await page.close();
  }
}

async function injectWatermark(doc: PDFDocument, payload: WatermarkPayload) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = `render.messesum.com • token=${payload.token} • request=${payload.requestId} • ip=${payload.ip ?? 'n/a'} • ua=${payload.userAgent}`;
  const timestampText = `ts=${payload.timestamp}`;
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const stepX = 260;
    const stepY = 140;
    for (let x = -80; x < width + 80; x += stepX) {
      for (let y = 0; y < height + stepY; y += stepY) {
        page.drawText(text, {
          x,
          y,
          size: 12,
          font,
          color: rgb(0.4, 0.4, 0.4),
          opacity: 0.08,
          rotate: degrees(-30)
        });
      }
    }
    page.drawText(timestampText, {
      x: width - 220,
      y: 24,
      size: 10,
      font,
      color: rgb(0.35, 0.35, 0.35),
      opacity: 0.4
    });
  });
}
