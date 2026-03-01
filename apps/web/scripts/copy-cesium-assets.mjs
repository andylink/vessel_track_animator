import fs from 'node:fs/promises';
import path from 'node:path';

async function copyCesiumAssets() {
  const sourceDir = path.join(process.cwd(), 'node_modules', 'cesium', 'Build', 'Cesium');
  const targetDir = path.join(process.cwd(), 'public', 'cesium');

  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });

  console.log(`Copied Cesium assets to ${targetDir}`);
}

copyCesiumAssets().catch((error) => {
  console.error('Failed to copy Cesium assets:', error);
  process.exit(1);
});