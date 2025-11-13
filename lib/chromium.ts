import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import type { LaunchOptions } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const viewport = { width: 1240, height: 1754, deviceScaleFactor: 2 } as const;

async function resolveLocalExecutable(): Promise<string> {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch (error) {
      // ignore and try next candidate
    }
  }

  throw new Error(
    '无法找到可执行的 Chrome/Chromium，请设置 CHROME_EXECUTABLE_PATH 环境变量。'
  );
}

function shouldUseLambdaChromium() {
  if (process.env.CHROMIUM_FORCE_AWS === 'true') return true;
  if (process.env.CHROMIUM_FORCE_LOCAL === 'true') return false;
  return Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.LAMBDA_TASK_ROOT);
}

export async function getLaunchOptions(): Promise<LaunchOptions> {
  if (shouldUseLambdaChromium()) {
    const executablePath = await chromium.executablePath();
    if (!executablePath) {
      throw new Error('Chromium executable path is undefined.');
    }
    return {
      args: [...chromium.args, '--font-render-hinting=medium', '--force-color-profile=srgb'],
      defaultViewport: viewport,
      executablePath,
      headless: true
    };
  }

  const executablePath = await resolveLocalExecutable();
  return {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=medium'],
    defaultViewport: viewport,
    executablePath,
    headless: true
  };
}
