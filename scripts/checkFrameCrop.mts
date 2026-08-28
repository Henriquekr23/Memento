/**
 * Asserts do enquadramento da foto e da geometria da página.
 *
 * Fora do `tsconfig` do app, como os outros. Roda com:
 *   npx tsx scripts/checkFrameCrop.mts
 *
 * O que está sendo protegido: a foto não pode abrir papel vazio dentro do
 * quadro, não pode escapar dele, e a tela e o PDF precisam concordar — os dois
 * chamam exatamente estas funções.
 */

import assert from 'node:assert/strict';

import { clampOffset, cropRatios } from '../src/features/album-editor/frameCrop.ts';
import { PAGE_MARGIN, pageInsets } from '../src/features/album-editor/pageLayout.ts';
import { SPEC } from '../src/features/album-print/spec.ts';
import { makePage } from '../src/types/album-editor.ts';

const near = (a: number, b: number, msg: string) =>
  assert.ok(Math.abs(a - b) < 1e-9, `${msg} (${a} ≠ ${b})`);

/* ── preencher: a foto sobra dos dois lados, nunca falta ─────────────────── */
{
  // Quadro em pé, foto deitada.
  const r = cropRatios(1, 2, 3, 2, 'cover', 1);
  near(r.rw, 3, 'a foto deitada sobra na largura');
  near(r.rh, 1, 'e encosta exatamente na altura');
  near(r.maxX, (2 / 3) * 50, 'o passeio lateral é o que sobra dela');
  near(r.maxY, 0, 'sem sobra na altura, não há para onde subir');
}

/* ── foto inteira: ela cabe dentro, e o limite a mantém dentro ───────────── */
{
  const r = cropRatios(1, 2, 3, 2, 'contain', 1);
  near(r.rw, 1, 'a foto inteira encosta na largura');
  near(r.rh, 1 / 3, 'e falta na altura');
  near(r.maxX, 0, 'nada a passear na largura');
  near(r.maxY, 100, 'na altura ela anda até encostar por dentro');
}

/* ── o zoom é multiplicador do encaixe, e amplia o passeio ───────────────── */
{
  const one = cropRatios(4, 3, 4, 3, 'cover', 1);
  near(one.maxX, 0, 'foto e quadro da mesma forma: sem folga a zoom 1');
  near(one.maxY, 0, 'idem na altura');

  const two = cropRatios(4, 3, 4, 3, 'cover', 2);
  near(two.rw, 2, 'o zoom dobra o lado desenhado');
  near(two.maxX, 25, 'e o passeio é metade do que sobra, em % do lado');
  near(two.maxY, 25, 'igual na altura');
}

/* ── invariante do "preencher": nunca sobra papel dentro do quadro ───────── */
for (const [fw, fh] of [[1, 1], [3, 2], [2, 3], [16, 9]]) {
  for (const [iw, ih] of [[4000, 3000], [3000, 4000], [5000, 1000], [800, 800]]) {
    for (const zoom of [1, 1.5, 3]) {
      const r = cropRatios(fw, fh, iw, ih, 'cover', zoom);
      assert.ok(r.rw >= 1 - 1e-9, 'preencher nunca deixa a foto mais estreita que o quadro');
      assert.ok(r.rh >= 1 - 1e-9, 'preencher nunca deixa a foto mais baixa que o quadro');

      // O deslocamento no limite encosta a borda da foto na borda do quadro —
      // e nem um passo além: é isso que impedia a foto de vazar da página.
      const edge = (clampOffset(999, r.maxX) / 100) * r.rw;
      near(edge, Math.max(0, (r.rw - 1) / 2), 'no limite, a borda da foto é a borda do quadro');
    }
  }
}

/* ── entradas impossíveis não quebram a página ───────────────────────────── */
{
  const r = cropRatios(0, 0, 0, 0, 'cover', 1);
  near(r.rw, 1, 'quadro ainda não medido desenha neutro');
  near(r.maxX, 0, 'e sem passeio');
  assert.equal(clampOffset(Number.NaN, 10), 0, 'deslocamento inválido vira zero');
  assert.equal(clampOffset(50, 10), 10, 'deslocamento guardado é podado ao que o zoom permite');
  assert.equal(clampOffset(-50, 10), -10, 'dos dois lados');
}

/* ── margens da página ───────────────────────────────────────────────────── */
{
  const page = makePage();
  const fill = pageInsets(page, 'left', SPEC.bleed);
  assert.deepEqual(
    fill,
    { top: 0, right: 0, bottom: 0, left: 0, gap: 0 },
    'preenchimento total vai até a borda do arquivo, sangria inclusive',
  );

  const framed = pageInsets({ ...page, fill: false, gap: 3 }, 'left', SPEC.bleed);
  assert.equal(framed.left, SPEC.bleed + SPEC.safe.spine, 'o lado da lombada recua mais');
  assert.equal(framed.right, SPEC.bleed + PAGE_MARGIN, 'o lado externo recua a margem');
  assert.equal(framed.top, SPEC.bleed + PAGE_MARGIN, 'em cima, a margem');
  assert.equal(framed.gap, 3, 'o respiro é o da página');

  const mirrored = pageInsets({ ...page, fill: false }, 'right', SPEC.bleed);
  assert.equal(mirrored.right, SPEC.bleed + SPEC.safe.spine, 'na outra mão, o recuo troca de lado');

  const thumb = pageInsets({ ...page, fill: false }, 'left', 0);
  assert.equal(thumb.top, PAGE_MARGIN, 'sem sangria no contêiner, a margem é só a da página');

  assert.equal(
    pageInsets({ ...page, gap: -5 }, 'left', 0).gap,
    0,
    'respiro negativo não existe',
  );
}

console.log('frame crop: todos os asserts passaram');
