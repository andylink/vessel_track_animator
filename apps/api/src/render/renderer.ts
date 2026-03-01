import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { encodeFramesToMp4 } from './ffmpeg';

function resolveChromiumPath() {
  return process.env.CHROMIUM_PATH || '/usr/bin/chromium';
}

export async function renderJob(params: {
  jobId: string;
  routePath: string;
  fps: number;
  music: boolean;
}) {
  const frameDir = path.join('/tmp/frames', params.jobId);
  const outputPath = path.join('/tmp/exports', `${params.jobId}.mp4`);
  await fs.mkdir(frameDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
    defaultViewport: { width: 3840, height: 2160 }
  });

  try {
    const page = await browser.newPage();
    const totalFrames = 300;
    const viewerUrl = `http://localhost:4000/?routePath=${encodeURIComponent(params.routePath)}&width=3840&height=2160&fps=${params.fps}&frames=${totalFrames}&seed=${params.jobId}`;
    await page.goto(viewerUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof (window as any).__setFrame === 'function', { timeout: 20000 });

    for (let frame = 0; frame < totalFrames; frame += 1) {
      await page.evaluate(
        ({ current, total }) => {
          (window as any).__setFrame?.(current, total);
        },
        { current: frame, total: totalFrames }
      );
      await page.screenshot({ path: path.join(frameDir, `frame_${String(frame).padStart(6, '0')}.png`) });
    }
  } finally {
    await browser.close();
  }

  await encodeFramesToMp4({ frameDir, fps: params.fps, outputPath, includeMusic: params.music });
  return outputPath;
}
