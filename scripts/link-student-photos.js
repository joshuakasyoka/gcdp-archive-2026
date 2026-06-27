const fs = require('fs');
const path = require('path');

const linkPath = path.join(__dirname, '../public/StudentPhotos');
const targetPath = path.resolve(__dirname, '../../../GCDP2025/public/StudentPhotos');

if (!fs.existsSync(targetPath)) {
  console.warn('link-student-photos: GCDP2025 StudentPhotos not found at', targetPath);
  process.exit(0);
}

try {
  if (fs.existsSync(linkPath)) {
    const stat = fs.lstatSync(linkPath);
    if (stat.isSymbolicLink()) process.exit(0);
    console.warn('link-student-photos: public/StudentPhotos exists and is not a symlink — skipping');
    process.exit(0);
  }
  fs.symlinkSync(targetPath, linkPath, 'dir');
  console.log('link-student-photos: linked public/StudentPhotos → GCDP2025');
} catch (err) {
  console.warn('link-student-photos:', err.message);
}
