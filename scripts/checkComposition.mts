/**
 * Asserts da serialização da composição (Fase 2).
 *
 * Fora do `tsconfig` do app, como o `checkPdfExport`. Roda com:
 *   npx tsx scripts/checkComposition.mts
 *
 * O que está sendo protegido: um álbum salvo hoje precisa abrir amanhã, mesmo
 * que o formato mude. Por isso o parser nunca lança — e é isso que os casos
 * feios abaixo verificam.
 */

import assert from 'node:assert/strict';

import {
  COMPOSITION_VERSION,
  EMPTY_COMPOSITION,
  parseComposition,
  pruneComposition,
} from '../src/features/album-save/composition.ts';

// ── Ida e volta ────────────────────────────────────────────────────────────
const full = {
  version: COMPOSITION_VERSION,
  layoutOverrides: { 'page-1': 'quad' },
  captions: { 'page-1': 'Primeiro dia' },
  photoCaptions: { a: 'Chegada' },
  adjustments: { a: { focusX: 40, focusY: 60, zoom: 1.4, rotation: -3 } },
  placements: { a: { x: 10, y: 12, w: 50, h: 40, z: 7 } },
  composeModes: { 'page-1': 'free' },
  groupKeys: { a: 'inserted:x1' },
  stories: [{ id: 's1', anchorPhotoId: 'a', title: 'Dia 1', body: 'Chovia.' }],
  emptyPages: [{ id: 'e1', anchorPhotoId: 'end' }],
  theme: { cover: 'navy', paper: 'kraft', frame: 'corners', font: 'sans' },
  autoTilt: false,
};

const roundTrip = parseComposition(JSON.parse(JSON.stringify(full)));
assert.deepEqual(roundTrip, full, 'ida e volta pelo JSON deve preservar tudo');

// ── Entradas quebradas não derrubam o álbum ────────────────────────────────
assert.deepEqual(parseComposition(null), EMPTY_COMPOSITION);
assert.deepEqual(parseComposition('nada disso'), EMPTY_COMPOSITION);
assert.deepEqual(parseComposition([1, 2, 3]), EMPTY_COMPOSITION);

const dirty = parseComposition({
  layoutOverrides: { p: 'inexistente' },
  composeModes: { p: 'diagonal' },
  theme: { cover: 'ouro', paper: 'white' },
  adjustments: { a: { zoom: 'muito' } },
  stories: [{ semId: true }, { id: 'ok' }],
  autoTilt: 'talvez',
});

assert.deepEqual(dirty.layoutOverrides, {}, 'layout desconhecido é descartado');
assert.deepEqual(dirty.composeModes, {}, 'modo desconhecido é descartado');
assert.equal(dirty.theme.cover, 'leather', 'valor de tema inválido cai no padrão');
assert.equal(dirty.theme.paper, 'white', 'valor de tema válido sobrevive');
assert.equal(dirty.adjustments.a.zoom, 1, 'número inválido vira o padrão');
assert.equal(dirty.stories.length, 1, 'história sem id é descartada');
assert.equal(dirty.stories[0].title, '', 'campo ausente vira string vazia');
assert.equal(dirty.autoTilt, true, 'booleano inválido cai no padrão');

// ── Poda: o que aponta para foto que não foi salva ─────────────────────────
const pruned = pruneComposition(parseComposition(full), ['b']);
assert.deepEqual(pruned.photoCaptions, {}, 'legenda de foto ausente sai');
assert.deepEqual(pruned.adjustments, {}, 'ajuste de foto ausente sai');
assert.deepEqual(pruned.groupKeys, {}, 'grupo de foto ausente sai');
assert.equal(
  pruned.stories[0].anchorPhotoId,
  'end',
  'âncora perdida vai para o fim em vez de sumir',
);
assert.deepEqual(
  pruned.captions,
  { 'page-1': 'Primeiro dia' },
  'legenda de página não depende de foto e permanece',
);

const kept = pruneComposition(parseComposition(full), ['a']);
assert.equal(kept.stories[0].anchorPhotoId, 'a', 'âncora existente é preservada');

console.log('composition: todos os asserts passaram');
