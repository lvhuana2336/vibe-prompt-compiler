import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const outputSize = 256;
const scale = 4;
const size = outputSize * scale;
const pixels = new Uint8Array(size * size * 4);

const colors = {
  ink: [27, 29, 24, 255],
  lime: [216, 255, 99, 255],
  transparent: [0, 0, 0, 0],
};

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const nearestX = Math.max(left + radius, Math.min(x, right - radius));
  const nearestY = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function insideRotatedBar(x, y, cx, cy, halfWidth, halfHeight, angle) {
  const radians = (angle * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const localX = dx * Math.cos(radians) + dy * Math.sin(radians);
  const localY = -dx * Math.sin(radians) + dy * Math.cos(radians);
  return insideRoundedRect(
    localX,
    localY,
    -halfWidth,
    -halfHeight,
    halfWidth,
    halfHeight,
    halfWidth,
  );
}

for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    const s = size / 1024;
    const px = x / s;
    const py = y / s;
    const inTile = insideRoundedRect(px, py, 32, 32, 992, 992, 220);
    if (!inTile) {
      setPixel(x, y, colors.transparent);
      continue;
    }

    setPixel(x, y, colors.ink);
    const inBar =
      insideRotatedBar(px, py, 340, 655, 56, 132, -16) ||
      insideRotatedBar(px, py, 505, 490, 56, 270, -16) ||
      insideRotatedBar(px, py, 690, 605, 56, 185, -16);
    if (inBar) setPixel(x, y, colors.lime);
  }
}

const rgba = Buffer.alloc(outputSize * outputSize * 4);
for (let y = 0; y < outputSize; y += 1) {
  for (let x = 0; x < outputSize; x += 1) {
    const sum = [0, 0, 0, 0];
    for (let sy = 0; sy < scale; sy += 1) {
      for (let sx = 0; sx < scale; sx += 1) {
        const sourceX = x * scale + sx;
        const sourceY = y * scale + sy;
        const offset = (sourceY * size + sourceX) * 4;
        for (let channel = 0; channel < 4; channel += 1) {
          sum[channel] += pixels[offset + channel];
        }
      }
    }
    const outputOffset = (y * outputSize + x) * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      rgba[outputOffset + channel] = Math.round(sum[channel] / (scale * scale));
    }
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(outputSize, 0);
header.writeUInt32BE(outputSize, 4);
header[8] = 8;
header[9] = 6;

const scanlines = Buffer.alloc(outputSize * (outputSize * 4 + 1));
for (let y = 0; y < outputSize; y += 1) {
  const target = y * (outputSize * 4 + 1);
  scanlines[target] = 0;
  rgba.copy(scanlines, target + 1, y * outputSize * 4, (y + 1) * outputSize * 4);
}

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", zlib.deflateSync(scanlines, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const iconHeader = Buffer.alloc(22);
iconHeader.writeUInt16LE(0, 0);
iconHeader.writeUInt16LE(1, 2);
iconHeader.writeUInt16LE(1, 4);
iconHeader[6] = 0;
iconHeader[7] = 0;
iconHeader[8] = 0;
iconHeader[9] = 0;
iconHeader.writeUInt16LE(1, 10);
iconHeader.writeUInt16LE(32, 12);
iconHeader.writeUInt32LE(png.length, 14);
iconHeader.writeUInt32LE(22, 18);

const buildDir = path.resolve("build");
await fs.mkdir(buildDir, { recursive: true });
await fs.writeFile(path.join(buildDir, "icon.png"), png);
await fs.writeFile(path.join(buildDir, "icon.ico"), Buffer.concat([iconHeader, png]));

console.log(`Generated build/icon.png and build/icon.ico (${png.length} bytes)`);
