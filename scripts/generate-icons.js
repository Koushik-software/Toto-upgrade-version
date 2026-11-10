import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import { execSync } from 'child_process';

const iconSvg = fs.readFileSync(path.resolve('public/icon.svg'), 'utf-8');
const maskableSvg = fs.readFileSync(path.resolve('public/icon-maskable.svg'), 'utf-8');

function renderPng(svg, width, height) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log('Rendering 512x512 PNG...');
const png512 = renderPng(iconSvg, 512, 512);
fs.writeFileSync(path.resolve('public/pwa-512x512.png'), png512);

console.log('Rendering 192x192 PNG...');
const png192 = renderPng(iconSvg, 192, 192);
fs.writeFileSync(path.resolve('public/pwa-192x192.png'), png192);

console.log('Rendering 180x180 Apple Touch Icon...');
const png180 = renderPng(iconSvg, 180, 180);
fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), png180);

console.log('Rendering 512x512 Maskable PNG...');
const maskable512 = renderPng(maskableSvg, 512, 512);
fs.writeFileSync(path.resolve('public/pwa-maskable-512x512.png'), maskable512);

console.log('Converting to JPEG and ICO with convert...');
try {
  // convert PNG to JPEG
  execSync('convert public/pwa-512x512.png -quality 95 "public/app logo.jpeg"');
  execSync('cp "public/app logo.jpeg" public/app-logo.jpeg');
  execSync('convert public/pwa-192x192.png -resize 32x32 public/favicon.ico');
  console.log('All image assets created successfully!');
} catch (err) {
  console.error('Convert failed:', err);
  // Fallback if convert fails: write png as jpeg
  fs.writeFileSync(path.resolve('public/app logo.jpeg'), png512);
  fs.writeFileSync(path.resolve('public/app-logo.jpeg'), png512);
}
