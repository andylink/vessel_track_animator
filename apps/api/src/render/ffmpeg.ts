import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function encodeFramesToMp4(params: {
  frameDir: string;
  fps: number;
  outputPath: string;
  includeMusic: boolean;
}) {
  await fs.mkdir(path.dirname(params.outputPath), { recursive: true });

  const musicTrack = '/workspaces/vessel_track_animator/apps/web/public/audio/demo.mp3';
  const hasMusic = params.includeMusic;

  const baseArgs = [
    '-y',
    '-framerate',
    String(params.fps),
    '-i',
    path.join(params.frameDir, 'frame_%06d.png'),
    '-f',
    'lavfi',
    '-i',
    'anullsrc=channel_layout=stereo:sample_rate=48000'
  ];

  const args = hasMusic
    ? [
        ...baseArgs,
        '-i',
        musicTrack,
        '-filter_complex',
        '[2:a]volume=0.125[music];[1:a][music]amix=inputs=2:duration=shortest[aout]',
        '-map',
        '0:v',
        '-map',
        '[aout]'
      ]
    : [...baseArgs, '-map', '0:v', '-map', '1:a'];

  args.push(
    '-s',
    '3840x2160',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-r',
    String(params.fps),
    '-shortest',
    params.outputPath
  );

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with exit code ${code}`));
      }
    });
  });
}
