/**
 * Asserts da /album em etapas: quem está no álbum, a volta de uma foto para o
 * lugar dela no tempo, e as páginas que a etapa 2 mostra e o editor recebe.
 *
 * Fora do `tsconfig` do app, como os outros. Roda com:
 *   npx tsx scripts/checkAlbumFlow.mts
 *
 * O que está sendo protegido: tirar uma foto não a apaga (ela volta), o quadro
 * escolhido pela pessoa fica onde ela pôs (vazios no meio inclusive), e o
 * editor abre com as mesmas páginas que a etapa 2 mostrou.
 */

import assert from 'node:assert/strict';

import { includedInOrder, pruneExcluded } from '../src/features/album-builder/selection.ts';
import {
  chronologicalSlot,
  compactCells,
  insertAt,
  placeAt,
  syncCells,
  toPages,
} from '../src/features/album-flow/cells.ts';
import { composeFromCells, pruneComposition } from '../src/features/album-flow/compose.ts';
import { pageCountFor, planSignature, toSpreads } from '../src/features/album-flow/paginate.ts';

type P = { id: string; timestamp: Date; timestampSource: 'exif' | 'file' };
const at = (id: string, hour: number, source: 'exif' | 'file' = 'exif'): P => ({
  id,
  timestamp: new Date(2026, 2, 14, hour),
  timestampSource: source,
});

const a = at('a', 8);
const b = at('b', 9);
const c = at('c', 10);
const d = at('d', 11);
const semData = at('x', 7, 'file');
const byId = new Map([a, b, c, d, semData].map((p) => [p.id, p]));

// Fora do álbum continua na lista, só some das páginas.
assert.deepEqual(includedInOrder([a, b, c, d], new Set(['b'])).map((p) => p.id), ['a', 'c', 'd']);
assert.deepEqual([...pruneExcluded(new Set(['a', 'z']), [a, b])], ['a']);

// Páginas: sempre par, nunca menos que quatro.
assert.equal(pageCountFor(0, 2), 4);
assert.equal(pageCountFor(11, 2), 6);
assert.equal(pageCountFor(13, 1), 14);
assert.equal(pageCountFor(9, 4), 4);

// Sem nada guardado: em sequência, sobra em branco.
{
  const cells = syncCells(null, ['1', '2', '3', '4', '5'], 2);
  assert.equal(cells.length, 8);
  const pages = toPages(cells, 2);
  assert.deepEqual(pages[0], ['1', '2']);
  assert.deepEqual(pages[2], ['5', null]);
  assert.equal(toSpreads(pages).length, 2);
}

// Quem saiu deixa o quadro vazio; quem chegou entra depois do último ocupado.
assert.deepEqual(syncCells(['1', null, '3', null], ['1', '3', '4'], 1), ['1', null, '3', '4']);
assert.deepEqual(syncCells(['1', '2', '3', null], ['1', '3'], 1), ['1', null, '3', null]);
// Quadros vazios sobrando no fim encolhem até a página inteira mais próxima.
assert.equal(syncCells(['1', ...Array(20).fill(null)], ['1'], 1).length, 4);
// Foto deixada na última página mantém o buraco no meio.
assert.deepEqual(syncCells([null, null, null, '1'], ['1'], 1), [null, null, null, '1']);

// Levar para quadro vazio muda; para quadro ocupado troca.
assert.deepEqual(placeAt(['1', '2', null, null], '1', 3), [null, '2', null, '1']);
assert.deepEqual(placeAt(['1', '2', null, null], '1', 1), ['2', '1', null, null]);

// Inserir empurra só até o primeiro buraco.
assert.deepEqual(insertAt(['1', '2', null, '4'], 0, '9'), ['9', '1', '2', '4']);
assert.deepEqual(insertAt(['1', '2'], 1, '9'), ['1', '9', '2']);

// Devolver: antes do primeiro quadro com data maior; sem data, no fim.
assert.equal(chronologicalSlot(['a', 'c', 'd', null], b, byId), 1);
assert.equal(chronologicalSlot(['a', null, 'x', null], c, byId), 2);
assert.equal(chronologicalSlot(['a', 'c', null, null], semData, byId), 2);
assert.equal(chronologicalSlot(['a', null, null, null], d, byId), 1);

// Trocar o layout reflui sem buracos.
assert.deepEqual(compactCells([null, '1', null, '2']), ['1', '2']);

// A assinatura muda com ordem, buraco e layout.
assert.notEqual(planSignature(['1', '2'], 2), planSignature(['2', '1'], 2));
assert.notEqual(planSignature(['1', null, '2'], 1), planSignature(['1', '2', null], 1));
assert.notEqual(planSignature(['1', '2'], 2), planSignature(['1', '2'], 3));

// O editor abre com as mesmas páginas da etapa 2, buracos inclusive.
{
  const cells = syncCells(['1', null, '3'], ['1', '3'], 3);
  const album = composeFromCells(cells, 3, 'Viagem');
  assert.equal(album.name, 'Viagem');
  assert.equal(album.pages.length, 4);
  assert.equal(album.pages[0].layout, 'trio');
  assert.deepEqual(album.pages[0].slots.map((s) => s.photoId), ['1', null, '3', null]);

  // Refazer as páginas mantém a capa.
  const base = { ...album, color: 'outra-cor' };
  const rebuilt = composeFromCells(syncCells(null, ['3', '1'], 1), 1, 'Viagem', base);
  assert.equal(rebuilt.color, 'outra-cor');
  assert.equal(rebuilt.pages[0].layout, 'full');
  assert.equal(rebuilt.pages[1].slots[0].photoId, '1');

  // Foto tirada do álbum some do quadro, o resto fica onde estava.
  const pruned = pruneComposition(album, new Set(['1']));
  assert.deepEqual(pruned.pages[0].slots.map((s) => s.photoId), ['1', null, null, null]);
  assert.equal(pruneComposition(album, new Set(['1', '3'])), album);
}

console.log('checkAlbumFlow: ok');
