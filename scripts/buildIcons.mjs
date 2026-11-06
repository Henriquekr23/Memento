/**
 * Gera `src/app/favicon.ico` (16 + 32px) e `src/app/apple-icon.png` (180px) a
 * partir de `src/app/icon.svg`. Rodar depois de mexer na marca:
 *
 *   node scripts/buildIcons.mjs
 *
 * Usa o `sharp` que já vem com o Next. O `.ico` é montado à mão: é só um
 * cabeçalho com os PNGs colados em seguida, formato que todo navegador lê.
 * O ícone da Apple sai sem o canto arredondado — o iOS recorta sozinho, e um
 * canto já arredondado ficaria com uma borda clara por dentro do recorte.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const dir = new URL('../src/app/', import.meta.url);
const svg = readFileSync(new URL('icon.svg', dir), 'utf8');

const render = (source, px) =>
  sharp(Buffer.from(source), { density: (72 * px) / 32 }).resize(px, px).png().toBuffer();

const pngs = await Promise.all([16, 32].map((px) => render(svg, px)));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const px = [16, 32][i];
  const at = 6 + 16 * i;
  header.writeUInt8(px, at);
  header.writeUInt8(px, at + 1);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(png.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += png.length;
});
writeFileSync(new URL('favicon.ico', dir), Buffer.concat([header, ...pngs]));

const square = svg.replace(/<rect([^>]*?) rx="[^"]*"/, '<rect$1');
const apple = await sharp(await render(square, 180)).flatten({ background: '#111111' }).png().toBuffer();
writeFileSync(new URL('apple-icon.png', dir), apple);

console.log('favicon.ico e apple-icon.png gerados a partir de icon.svg');
