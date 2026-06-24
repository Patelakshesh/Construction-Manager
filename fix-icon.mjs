import { Jimp } from "jimp";

async function main() {
  const logo = await Jimp.read("public/logo.png");
  
  // We want a large canvas, 1024x1024 for Capacitor
  // Increase logo size since it was too small
  const targetSize = 1024;
  const logoMaxDim = 700; 
  
  // Scale logo
  const scale = Math.min(logoMaxDim / logo.bitmap.width, logoMaxDim / logo.bitmap.height);
  logo.resize({ w: logo.bitmap.width * scale, h: logo.bitmap.height * scale });

  // 1. Create transparent foreground for Android Adaptive Icon
  const fg = new Jimp({ width: targetSize, height: targetSize, color: 0x00000000 });
  fg.composite(logo, (targetSize - logo.bitmap.width) / 2, (targetSize - logo.bitmap.height) / 2);
  await fg.write("assets/icon-foreground.png");

  // 2. Create white background for standard icon / iOS
  const icon = new Jimp({ width: targetSize, height: targetSize, color: 0xFFFFFFFF });
  icon.composite(logo, (targetSize - logo.bitmap.width) / 2, (targetSize - logo.bitmap.height) / 2);
  await icon.write("assets/icon.png");

  // 3. Create square PWA icon for web
  const pwaIcon = icon.clone();
  pwaIcon.resize({ w: 512, h: 512 });
  await pwaIcon.write("public/logo-square.png");
  
  console.log("Icons padded and regenerated successfully!");
}

main().catch(console.error);
