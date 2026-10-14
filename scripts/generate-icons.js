/**
 * Generates valid PNG and SVG icons for ZenPipes using Node built-in zlib & fs.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? -306674912 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makePng(width, height, getPixelRgba) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel;
  const rawData = Buffer.alloc((scanlineLength + 1) * height);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (scanlineLength + 1);
    rawData[scanlineOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const pixelOffset = scanlineOffset + 1 + x * bytesPerPixel;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, body, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

function renderZenPipesIcon(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;

  // Squircle rounded corners
  const cornerR = 0.22;
  const innerX = Math.abs(nx - 0.5) - (0.5 - cornerR);
  const innerY = Math.abs(ny - 0.5) - (0.5 - cornerR);
  if (innerX > 0 && innerY > 0) {
    const d = Math.sqrt(innerX * innerX + innerY * innerY);
    if (d > cornerR) return [0, 0, 0, 0];
  }

  // Dark background gradient
  const distCenter = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
  let bgR = Math.floor(6 + (14 - 6) * (1 - distCenter));
  let bgG = Math.floor(11 + (24 - 11) * (1 - distCenter));
  let bgB = Math.floor(18 + (42 - 18) * (1 - distCenter));

  // Glowing pipe conduit loop: smooth curved elbow from top to right and left to bottom
  let addedR = 0, addedG = 0, addedB = 0;

  // Center water fountain orb at (0.5, 0.5)
  if (distCenter < 0.08) {
    const intensity = 1 - (distCenter / 0.08);
    addedR += 220 * intensity;
    addedG += 250 * intensity;
    addedB += 255 * intensity;
  } else if (distCenter < 0.22) {
    const halo = Math.pow(1 - (distCenter / 0.22), 2);
    addedR += 0 * halo;
    addedG += 180 * halo;
    addedB += 240 * halo;
  }

  // Pipe line 1: vertical segment along x = 0.5
  if (Math.abs(nx - 0.5) < 0.035 && ny >= 0.18 && ny <= 0.82) {
    addedR += 30;
    addedG += 170;
    addedB += 230;
  }
  // Pipe line 2: horizontal segment along y = 0.5
  if (Math.abs(ny - 0.5) < 0.035 && nx >= 0.18 && nx <= 0.82) {
    addedR += 30;
    addedG += 170;
    addedB += 230;
  }

  // Lantern terminals at ends
  const terminals = [[0.5, 0.22], [0.78, 0.5], [0.5, 0.78], [0.22, 0.5]];
  for (const [tx, ty] of terminals) {
    const td = Math.sqrt((nx - tx) ** 2 + (ny - ty) ** 2);
    if (td < 0.05) {
      const tint = 1 - (td / 0.05);
      addedR += 255 * tint;
      addedG += 200 * tint;
      addedB += 50 * tint; // Golden lantern glow
    }
  }

  const finalR = Math.min(255, bgR + Math.floor(addedR));
  const finalG = Math.min(255, bgG + Math.floor(addedG));
  const finalB = Math.min(255, bgB + Math.floor(addedB));

  return [finalR, finalG, finalB, 255];
}

const srcDir = path.join(__dirname, '..', 'src');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

console.log('Generating icon-192.png...');
const icon192 = makePng(192, 192, renderZenPipesIcon);
fs.writeFileSync(path.join(srcDir, 'icon-192.png'), icon192);

console.log('Generating icon-512.png...');
const icon512 = makePng(512, 512, renderZenPipesIcon);
fs.writeFileSync(path.join(srcDir, 'icon-512.png'), icon512);

// Generate SVG favicon
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#102538"/>
      <stop offset="100%" stop-color="#060b12"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#bgGlow)"/>
  
  <!-- Flow Conduits -->
  <line x1="256" y1="110" x2="256" y2="402" stroke="#00e5ff" stroke-width="26" stroke-linecap="round" filter="url(#glow)"/>
  <line x1="110" y1="256" x2="402" y2="256" stroke="#00e5ff" stroke-width="26" stroke-linecap="round" filter="url(#glow)"/>
  
  <!-- Outer Lantern Terminals -->
  <circle cx="256" cy="110" r="24" fill="#ffb300" filter="url(#glow)"/>
  <circle cx="402" cy="256" r="24" fill="#ffb300" filter="url(#glow)"/>
  <circle cx="256" cy="402" r="24" fill="#ffb300" filter="url(#glow)"/>
  <circle cx="110" cy="256" r="24" fill="#ffb300" filter="url(#glow)"/>

  <!-- Center Fountain Core -->
  <circle cx="256" cy="256" r="44" fill="#ffffff" filter="url(#glow)"/>
  <circle cx="256" cy="256" r="22" fill="#00e5ff"/>
</svg>`;

fs.writeFileSync(path.join(srcDir, 'favicon.svg'), faviconSvg, 'utf8');
console.log('ZenPipes icons generated successfully.');
