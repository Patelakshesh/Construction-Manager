import { Jimp } from "jimp";

async function main() {
  const logo = await Jimp.read("public/logo.png");
  const size = Math.max(logo.bitmap.width, logo.bitmap.height) + 100; // Add some padding
  
  // Create a new square image with a white background
  const background = new Jimp({ width: size, height: size, color: 0xFFFFFFFF });
  
  // Composite the logo into the center
  const x = (size - logo.bitmap.width) / 2;
  const y = (size - logo.bitmap.height) / 2;
  
  background.composite(logo, x, y);
  
  // Resize to exactly 512x512 for standard PWA usage
  background.resize({ w: 512, h: 512 });
  
  await background.write("public/logo-square.png");
  console.log("Created public/logo-square.png");
  
  // Also create a 192x192 version
  background.resize({ w: 192, h: 192 });
  await background.write("public/logo-192.png");
  console.log("Created public/logo-192.png");
  
  // Replace capacitor assets icon too
  const capacitorBg = new Jimp({ width: 1024, height: 1024, color: 0xFFFFFFFF });
  const capX = (1024 - logo.bitmap.width) / 2;
  const capY = (1024 - logo.bitmap.height) / 2;
  capacitorBg.composite(logo, capX, capY);
  await capacitorBg.write("assets/icon.png");
  console.log("Created assets/icon.png");
}

main().catch(console.error);
