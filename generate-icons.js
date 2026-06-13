const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const png2icons = require('png2icons');

const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
const inputSvg = path.join(__dirname, 'assets', 'icons', 'icon.svg');
const pngDir = path.join(__dirname, 'assets', 'icons', 'png');
const icoPath = path.join(__dirname, 'assets', 'icons', 'icon.ico');
const icnsPath = path.join(__dirname, 'assets', 'icons', 'icon.icns');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(inputSvg);

  console.log('Generating high-fidelity PNGs from SVG...');

  // First render the SVG at 2048x2048 as a high-res source master
  // background: transparent so the squircle alpha channel is preserved
  const masterPng = await sharp(svgBuffer, { density: 600 })
    .resize(2048, 2048, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  // Downscale from the hi-res master for each size
  for (const size of sizes) {
    await sharp(masterPng)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: sharp.kernel.lanczos3,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(path.join(pngDir, `${size}x${size}.png`));
    console.log(`  ✅ ${size}x${size}.png`);
  }

  // Use the 1024x1024 PNG as the source for ICO/ICNS
  const source1024 = fs.readFileSync(path.join(pngDir, '1024x1024.png'));

  console.log('\nGenerating ICO (multi-resolution)...');
  const icoBuffer = png2icons.createICO(source1024, png2icons.BICUBIC2, 0, false, true);
  if (icoBuffer) {
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('  ✅ icon.ico');
  } else {
    console.error('  ❌ Failed to create icon.ico');
  }

  console.log('\nGenerating ICNS (macOS bundle)...');
  const icnsBuffer = png2icons.createICNS(source1024, png2icons.BICUBIC2, 0);
  if (icnsBuffer) {
    fs.writeFileSync(icnsPath, icnsBuffer);
    console.log('  ✅ icon.icns');
  } else {
    console.error('  ❌ Failed to create icon.icns');
  }

  console.log('\n🎉 All HD icons generated successfully!');
  console.log('   Source: icon.svg (zoomed, 185x185 viewBox on original 300x300)');
  console.log('   Master: 2048x2048 intermediate (density=600)');
  console.log('   PNGs:  ', sizes.map(s => `${s}x${s}`).join(', '));
}

generateIcons().catch(console.error);
