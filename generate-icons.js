import sharp from 'sharp';
import { resolve } from 'path';

async function processIcons() {
  const assetsDir = resolve('./assets');
  const logoPath = resolve(assetsDir, 'logo.png');
  const bgPath = resolve(assetsDir, 'icon-background.png');
  const fgPath = resolve(assetsDir, 'icon-foreground.png');

  try {
    // 1. Create solid background (1024x1024 white)
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      }
    })
    .png()
    .toFile(bgPath);
    console.log('✅ Created icon-background.png (1024x1024 white)');

    // 2. Create foreground
    // First, TRIM the logo to remove any empty transparent space around it!
    // Then resize it to 550x550 (which looks great within the 1024 circle).
    // The Safe Zone is roughly 432x432 to 600x600 depending on the exact masking shape.
    const trimmedLogoBuffer = await sharp(logoPath)
      .trim() // REMOVES ALL TRANSPARENT PADDING
      .toBuffer();

    const resizedLogo = await sharp(trimmedLogoBuffer)
      .resize(650, 650, { // Increased from 550 to 650 to make it larger
        fit: 'inside',
        kernel: sharp.kernel.lanczos3, // Highest quality resize algorithm
        withoutEnlargement: false // Allow enlargement even if it makes it blurry, since user wants it bigger
      })
      .toBuffer();

    // Now composite it onto a 1024x1024 transparent canvas
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      }
    })
    .composite([
      { input: resizedLogo, gravity: 'center' }
    ])
    .png()
    .toFile(fgPath);
    console.log('✅ Created icon-foreground.png (Trimmed & perfectly sized)');

    console.log('🎉 Successfully generated Android Adaptive Icons ready for Capacitor!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

processIcons();
