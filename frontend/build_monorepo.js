const fs = require('fs');
const path = require('path');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const frontendRoot = __dirname;
const desktopDist = path.join(frontendRoot, 'apps', 'desktop', 'dist');
const mobileDist = path.join(frontendRoot, 'apps', 'mobile', 'dist');
const outputDist = path.join(frontendRoot, 'dist');

// Clean and prepare output dist
if (fs.existsSync(outputDist)) {
  fs.rmSync(outputDist, { recursive: true, force: true });
}
fs.mkdirSync(outputDist, { recursive: true });

// 1. Copy desktop dist to root dist
if (fs.existsSync(desktopDist)) {
  copyDirSync(desktopDist, outputDist);
  console.log('✓ Copied desktop dist to root /');
} else {
  console.error('Desktop dist not found at:', desktopDist);
}

// 2. Copy mobile dist to /mobile subdirectory
const outputMobileDist = path.join(outputDist, 'mobile');
if (fs.existsSync(mobileDist)) {
  copyDirSync(mobileDist, outputMobileDist);
  console.log('✓ Copied mobile dist to /mobile');
} else {
  console.error('Mobile dist not found at:', mobileDist);
}

console.log('🎉 Unified Monorepo Dist Build Complete!');
