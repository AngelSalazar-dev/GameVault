// Generates favicon.ico (16x16, 32x32, 48x48) from a simple pixel design
// GameVault: dark vault door with green (#00ff88) dial on #0a0a0f background

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function createPNG(size) {
  // Draw pixel art scaled to size
  const pixels = Buffer.alloc(size * size * 4);

  const setPixel = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  };

  const BG = [10, 10, 15]; // #0a0a0f
  const GREEN = [0, 255, 136]; // #00ff88
  const GREEN_DIM = [0, 180, 96];

  // Background with rounded corners (approximate)
  const radius = Math.max(2, Math.floor(size * 0.18));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inCorner = false;
      if (x < radius && y < radius) inCorner = Math.hypot(radius - x, radius - y) > radius;
      else if (x >= size - radius && y < radius) inCorner = Math.hypot(x - (size - 1 - radius), radius - y) > radius;
      else if (x < radius && y >= size - radius) inCorner = Math.hypot(radius - x, y - (size - 1 - radius)) > radius;
      else if (x >= size - radius && y >= size - radius) inCorner = Math.hypot(x - (size - 1 - radius), y - (size - 1 - radius)) > radius;

      if (!inCorner) setPixel(x, y, BG[0], BG[1], BG[2]);
    }
  }

  // Border (green frame)
  const bw = Math.max(1, Math.floor(size * 0.06));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isBorder =
        x < bw || y < bw || x >= size - bw || y >= size - bw;
      if (isBorder) {
        // skip rounded corners already transparent/bg
        let inCorner = false;
        const radius2 = radius;
        if (x < radius2 && y < radius2) inCorner = Math.hypot(radius2 - x, radius2 - y) > radius2;
        else if (x >= size - radius2 && y < radius2) inCorner = Math.hypot(x - (size - 1 - radius2), radius2 - y) > radius2;
        else if (x < radius2 && y >= size - radius2) inCorner = Math.hypot(radius2 - x, y - (size - 1 - radius2)) > radius2;
        else if (x >= size - radius2 && y >= size - radius2) inCorner = Math.hypot(x - (size - 1 - radius2), y - (size - 1 - radius2)) > radius2;
        if (!inCorner) setPixel(x, y, GREEN[0], GREEN[1], GREEN[2]);
      }
    }
  }

  // Vault circle
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.3;
  const innerR = size * 0.18;
  const dotR = size * 0.08;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // Outer ring
      if (Math.abs(dist - outerR) < Math.max(1, size * 0.05)) {
        setPixel(x, y, GREEN[0], GREEN[1], GREEN[2]);
      }
      // Inner ring (dimmer)
      if (Math.abs(dist - innerR) < Math.max(0.5, size * 0.03)) {
        setPixel(x, y, GREEN_DIM[0], GREEN_DIM[1], GREEN_DIM[2]);
      }
      // Center dot
      if (dist < dotR) {
        setPixel(x, y, GREEN[0], GREEN[1], GREEN[2]);
      }
    }
  }

  // Spokes (vault handle)
  const spokeW = Math.max(1, Math.floor(size * 0.05));
  const spokeLen = outerR;
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  for (const angle of angles) {
    for (let t = dotR; t < spokeLen; t += 0.5) {
      const sx = Math.round(cx + Math.cos(angle) * t);
      const sy = Math.round(cy + Math.sin(angle) * t);
      for (let dx = -spokeW; dx <= spokeW; dx++) {
        for (let dy = -spokeW; dy <= spokeW; dy++) {
          if (dx * dx + dy * dy <= spokeW * spokeW) {
            setPixel(sx + dx, sy + dy, GREEN[0], GREEN[1], GREEN[2]);
          }
        }
      }
    }
  }

  // Build PNG
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter none
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(raw);

  function crc32(buf) {
    let table = crc32.table;
    if (!table) {
      table = crc32.table = [];
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    const crcData = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ICO format: header + directory entries + PNG data for each size
function createICO(sizes) {
  const pngs = sizes.map((s) => ({ size: s, data: createPNG(s) }));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4); // count

  const entries = [];
  let offset = 6 + pngs.length * 16;

  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // width
    entry[1] = size >= 256 ? 0 : size; // height
    entry[2] = 0; // colors
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(data.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const ico = createICO([16, 32, 48]);
const out = path.join(__dirname, "..", "src", "app", "favicon.ico");
fs.writeFileSync(out, ico);
console.log(`Wrote ${out} (${ico.length} bytes)`);

// Also write PNGs for reference
const png32 = createPNG(32);
fs.writeFileSync(path.join(__dirname, "..", "public", "favicon-32.png"), png32);
const png180 = createPNG(180);
fs.writeFileSync(path.join(__dirname, "..", "public", "apple-touch-icon.png"), png180);
console.log("Wrote public/favicon-32.png and public/apple-touch-icon.png");
