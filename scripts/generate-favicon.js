const sharp = require('sharp');
const fs = require('fs');

// Read the SVG file
const svgBuffer = fs.readFileSync('./public/favicon.svg');

// Generate 512x512 PNG
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile('./public/favicon.png')
  .then(() => console.log('✓ Generated favicon.png (512x512)'))
  .catch(err => console.error('Error generating PNG:', err));

// Generate 32x32 PNG for smaller sizes
sharp(svgBuffer)
  .resize(32, 32)
  .png()
  .toFile('./public/favicon-32x32.png')
  .then(() => console.log('✓ Generated favicon-32x32.png'))
  .catch(err => console.error('Error generating 32x32 PNG:', err));

// Generate 16x16 PNG for smallest sizes
sharp(svgBuffer)
  .resize(16, 16)
  .png()
  .toFile('./public/favicon-16x16.png')
  .then(() => console.log('✓ Generated favicon-16x16.png'))
  .catch(err => console.error('Error generating 16x16 PNG:', err));

console.log('Favicon generation started...');
