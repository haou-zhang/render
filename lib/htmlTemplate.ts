import Mustache from 'mustache';
import sanitizeHtml, { type IOptions } from 'sanitize-html';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getFontFaceCSS } from './fontLoader';

const allowedTags = [
  'section',
  'article',
  'header',
  'footer',
  'div',
  'main',
  'p',
  'span',
  'strong',
  'em',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'img',
  'style',
  'small'
];

let cache = new Map<string, string>();

async function loadTemplate(templateName: string) {
  if (cache.has(templateName)) return cache.get(templateName)!;
  const filePath = path.join(process.cwd(), 'template', `${templateName}.html`);
  try {
    const file = await readFile(filePath, 'utf-8');
    cache.set(templateName, file);
    return file;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`模板 ${templateName} 不存在`);
    }
    throw error;
  }
}

const allowedAttributes: IOptions['allowedAttributes'] = {
  '*': ['style', 'class', 'role', 'data-*', 'aria-*', 'title'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'loading']
};

export interface HtmlTemplateOptions {
  templateName: string;
  payload: Record<string, unknown>;
  meta: {
    token: string;
    requestId: string;
    requestTime: string;
  };
}

export async function renderHtml({ templateName, payload, meta }: HtmlTemplateOptions) {
  const template = await loadTemplate(templateName);
  const baseData = {
    ...payload,
    __meta: meta
  };
  const compiled = Mustache.render(template, baseData);
  const sanitized = sanitizeHtml(compiled, {
    allowedTags,
    allowedAttributes,
    allowVulnerableTags: false,
    allowedSchemes: ['http', 'https', 'data', 'mailto'],
    textFilter: (text) => text.replace(/\u2028|\u2029/g, ''),
    transformTags: {
      'img': (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          loading: attribs.loading ?? 'lazy'
        }
      })
    }
  });

  const fonts = await getFontFaceCSS();
  const baseStyles = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'AlibabaPuHuiTi', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
      background: #f3f4f6;
      color: #0f172a;
    }
    .sheet {
      width: 1240px;
      min-height: 1754px;
      padding: 80px 96px;
      margin: 0 auto;
      background: #fff;
      display: flex;
      flex-direction: column;
      gap: 24px;
      border-radius: 8px;
      box-shadow: 0 0 24px rgba(15, 23, 42, 0.06);
    }
    .notice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 24px;
    }
    .notice-title {
      font-size: 36px;
      letter-spacing: 1px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table td {
      padding: 6px 0;
      font-size: 15px;
    }
    .line-items {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }
    .line-items .tr {
      display: grid;
      grid-template-columns: 4fr 1fr 1fr 1fr 1fr;
      padding: 14px 18px;
      font-size: 15px;
      border-bottom: 1px solid #f1f5f9;
    }
    .line-items .tr:nth-child(2n) {
      background: #f8fafc;
    }
    .line-items .thead {
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
    }
    .amounts {
      margin-left: auto;
      text-align: right;
      font-size: 18px;
    }
    .money {
      font-feature-settings: 'tnum';
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    .c-name {
      font-weight: 600;
      color: #0f172a;
    }
    .watermark-badge {
      font-size: 12px;
      color: #94a3b8;
      text-align: right;
    }
  `;

  return `<!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>${fonts}\n${baseStyles}</style>
    </head>
    <body>
      ${sanitized}
    </body>
  </html>`;
}
