/**
 * Asserts da geometria de impressão.
 *
 * Função pura de milímetros em milímetros: roda sem navegador e sem canvas.
 * É o que protege o número que vai para a gráfica — errar a lombada por meio
 * milímetro é uma tiragem inteira com a capa torta.
 *
 *   npx tsx scripts/checkPrintSpec.mts
 *
 * Fora do `tsconfig` de propósito (ver `exclude`): é ferramenta de bancada.
 */

import assert from 'node:assert/strict';

import {
  COVER_MM,
  PAPERS,
  SPEC,
  fileSize,
  luminance,
  paperById,
  spineSafeWidth,
  spineTextSize,
  spineWidth,
  trimSize,
} from '../src/features/album-print/spec.ts';

// ── Formato ────────────────────────────────────────────────────────────────
assert.deepEqual(trimSize('portrait'), { w: 148, h: 210 }, 'A5 retrato');
assert.deepEqual(trimSize('landscape'), { w: 210, h: 148 }, 'paisagem é o A5 deitado');
assert.deepEqual(
  fileSize('portrait'),
  { w: 158, h: 220 },
  'o arquivo tem 5 mm de sangria de cada lado',
);
assert.deepEqual(fileSize('landscape'), { w: 220, h: 158 });
assert.equal(SPEC.safe.spine, 12, 'o lado da lombada tem área segura maior que as bordas');
assert.ok(SPEC.safe.spine > SPEC.safe.outer);

// ── Lombada ────────────────────────────────────────────────────────────────
// 64 páginas = 32 folhas. Em couché 170 g (0,16 mm): 32 × 0,16 + 0,6 = 5,72 mm.
assert.equal(spineWidth(64, 0.16), 5.72, 'espessura = folhas × papel + capa');
assert.equal(spineWidth(64, 0.16), 32 * 0.16 + COVER_MM);
assert.equal(spineWidth(2, 0.14), SPEC.spineMin, 'álbum fino respeita o mínimo do gabarito');
assert.equal(spineWidth(0, 0.24), SPEC.spineMin, 'álbum sem páginas não tem lombada negativa');
assert.equal(
  spineWidth(65, 0.16),
  spineWidth(66, 0.16),
  'página ímpar ocupa a folha inteira: 65 e 66 páginas engordam igual',
);

for (const paper of PAPERS) {
  assert.ok(paper.mm > 0, `${paper.id} precisa de espessura`);
  assert.equal(paperById(paper.id).id, paper.id);
}
assert.equal(paperById('inexistente' as never).id, 'c170', 'papel desconhecido cai no padrão');

// ── Texto da lombada ───────────────────────────────────────────────────────
assert.equal(spineSafeWidth(5.72), 3.72, 'a área segura come 1 mm de cada lado');
assert.equal(spineSafeWidth(1), 0, 'lombada menor que a área segura não vira negativa');
assert.ok(
  spineTextSize(5.72, null) <= spineSafeWidth(5.72),
  'o corpo calculado cabe na área segura',
);
assert.equal(spineTextSize(100, null), 4.6, 'lombada larga para no teto de leitura');
assert.equal(spineTextSize(5.72, 9), 9, 'o corpo informado à mão vence o cálculo');

for (const pages of [4, 20, 64, 120, 300]) {
  for (const paper of PAPERS) {
    const spine = spineWidth(pages, paper.mm);
    assert.ok(
      spineTextSize(spine, null) <= Math.max(spineSafeWidth(spine), 0.1),
      `corpo automático estoura a área segura em ${pages} pág. / ${paper.id}`,
    );
  }
}

// ── Contraste ──────────────────────────────────────────────────────────────
assert.ok(luminance('#FFFFFF') > 0.99, 'branco é luminância 1');
assert.ok(luminance('#000000') < 0.01, 'preto é luminância 0');
assert.ok(luminance('#8ED2F0') > luminance('#1D3FBE'), 'azul céu é mais claro que cobalto');

console.log('print spec: todos os asserts passaram');
