import { Jimp } from 'jimp';

async function generatePaddedIcons() {
  try {
    const original = await Jimp.read('public/logo.png');
    
    // Create a 512x512 white background (0xffffffff is solid white)
    const bg512 = new Jimp({ width: 512, height: 512, color: 0xffffffff });
    
    // Resize the original logo to 340x340 so it has plenty of padding (safe zone)
    original.scaleToFit({ w: 340, h: 340 });
    
    // Place the logo directly in the center of the white background
    const x = Math.floor((512 - original.bitmap.width) / 2);
    const y = Math.floor((512 - original.bitmap.height) / 2);
    bg512.composite(original, x, y);
    
    // Save the padded versions
    await bg512.write('public/pwa-512x512.png');
    console.log('Created padded pwa-512x512.png');

    const bg192 = bg512.clone().resize({ w: 192, h: 192 });
    await bg192.write('public/pwa-192x192.png');
    console.log('Created padded pwa-192x192.png');

    const bg180 = bg512.clone().resize({ w: 180, h: 180 });
    await bg180.write('public/apple-touch-icon-180x180.png');
    console.log('Created padded apple-touch-icon-180x180.png');

    console.log('All padded icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generatePaddedIcons();
