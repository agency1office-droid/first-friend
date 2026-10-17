import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const source = await readFile(new URL("../public/favicon.svg", import.meta.url));
for (const [name, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  await sharp(source).resize(size, size).flatten({ background: "#ffffff" }).png().toFile(new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/i, "$1"));
}
const png = await sharp(source).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header[6] = 32; header[7] = 32; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
await writeFile(new URL("../public/favicon.ico", import.meta.url), Buffer.concat([header, png]));
