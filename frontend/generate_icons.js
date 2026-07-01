import { Jimp } from 'jimp';

async function generateIcons() {
  try {
    const image = await Jimp.read('public/logo.png');
    
    // Generate Android 192x192
    await image.clone().resize({ w: 192, h: 192 }).write('public/pwa-192x192.png');
    console.log('Created pwa-192x192.png');

    // Generate Android 512x512
    await image.clone().resize({ w: 512, h: 512 }).write('public/pwa-512x512.png');
    console.log('Created pwa-512x512.png');

    // Generate iOS 180x180
    await image.clone().resize({ w: 180, h: 180 }).write('public/apple-touch-icon-180x180.png');
    console.log('Created apple-touch-icon-180x180.png');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
