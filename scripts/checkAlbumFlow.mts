/**
 * Asserts da /album em etapas: quem está no álbum, a ordem da etapa 2 e a
 * composição de partida das páginas que o editor recebe.
 *
 * Fora do `tsconfig` do app, como os outros. Roda com:
 *   npx tsx scripts/checkAlbumFlow.mts
 *
 * O que está sendo protegido: tirar uma foto não a apaga (ela volta), mexer na
 * ordem é inserir (o resto anda), e as páginas nascem da ordem sem desmanchar a
 * capa quando são refeitas.
 */

import assert from 'node:assert/strict';

import { includedInOrder, pruneExcluded } from '../src/features/album-builder/selection.ts';
import { composeFromOrder, pruneComposition } from '../src/features/album-flow/compose.ts';
import { moveNextTo } from '../src/features/album-flow/order.ts';
import { pageCountFor, toSpreads } from '../src/features/album-flow/paginate.ts';
import { relayoutPage } from '../src/features/album-editor/relayout.ts';

type P = { id: string; timestamp: Date; timestampSource: 'exif' | 'file' };
const at = (id: string, hour: number): P => ({
  id,
  timestamp: new Date(2026, 2, 14, hour),
  timestampSource: 'exif',
});

const a = at('a', 8);
const b = at('b', 9);
const c = at('c', 10);
const d = at('d', 11);

// Fora do álbum continua na lista, só some das páginas.
assert.deepEqual(includedInOrder([a, b, c, d], new Set(['b'])).map((p) => p.id), ['a', 'c', 'd']);
assert.deepEqual([...pruneExcluded(new Set(['a', 'z']), [a, b])], ['a']);

// Etapa 2: mexer na ordem é inserir, e o resto anda.
assert.deepEqual(moveNextTo(['a', 'b', 'c', 'd'], 'd', 'b', 'before'), ['a', 'd', 'b', 'c']);
assert.deepEqual(moveNextTo(['a', 'b', 'c', 'd'], 'a', 'c', 'after'), ['b', 'c', 'a', 'd']);
assert.deepEqual(moveNextTo(['a', 'b'], 'a', 'a', 'after'), ['a', 'b']);
assert.deepEqual(moveNextTo(['a', 'b'], 'z', 'a', 'after'), ['a', 'b']);

// Páginas: sempre par, nunca menos que quatro.
assert.equal(pageCountFor(0, 2), 4);
assert.equal(pageCountFor(11, 2), 6);
assert.equal(pageCountFor(13, 1), 14);
assert.equal(pageCountFor(9, 4), 4);
assert.equal(toSpreads([1, 2, 3, 4]).length, 2);

// As páginas nascem da ordem, `perPage` por página; sobra em branco.
{
  const album = composeFromOrder(['1', '2', '3', '4', '5'], 2, 'Viagem');
  assert.equal(album.name, 'Viagem');
  assert.equal(album.pages.length, 4);
  assert.equal(album.pages[0].layout, 'duoH');
  assert.deepEqual(album.pages[0].slots.map((s) => s.photoId), ['1', '2', null, null]);
  assert.deepEqual(album.pages[2].slots.map((s) => s.photoId), ['5', null, null, null]);

  // Refazer as páginas mantém a capa.
  const base = { ...album, color: 'outra-cor' };
  const rebuilt = composeFromOrder(['3', '1'], 1, 'Viagem', base);
  assert.equal(rebuilt.color, 'outra-cor');
  assert.equal(rebuilt.pages[0].layout, 'full');
  assert.equal(rebuilt.pages[1].slots[0].photoId, '1');

  // Foto tirada do álbum some do quadro, o resto fica onde estava.
  const pruned = pruneComposition(album, new Set(['1', '3', '4', '5']));
  assert.deepEqual(pruned.pages[0].slots.map((s) => s.photoId), ['1', null, null, null]);
  assert.equal(pruneComposition(album, new Set(['1', '2', '3', '4', '5'])), album);
}

// Trocar o tipo da página não esconde foto: a que não cabe vai para o fim.
{
  // 5 fotos, 2 por página → páginas 1–3 com foto, página 4 em branco.
  const album = composeFromOrder(['1', '2', '3', '4', '5'], 2, 'Viagem');
  assert.equal(album.pages.length, 4);
  album.pages[0].slots[1].zoom = 2;

  const one = relayoutPage(album, 0, 'full');
  assert.equal(one.moved, 1);
  assert.equal(one.movedTo, 3, 'vai para a primeira página em branco depois da última cheia');
  assert.deepEqual(one.album.pages[0].slots.map((s) => s.photoId), ['1', null, null, null]);
  assert.equal(one.album.pages[3].slots[0].photoId, '2');
  assert.equal(one.album.pages[3].slots[0].zoom, 2, 'leva o enquadramento junto');
  assert.equal(one.album.pages[3].layout, 'full');
  assert.equal(one.album.pages.length, 4);

  // Sem página em branco no fim, o álbum ganha uma folha.
  const again = relayoutPage(one.album, 1, 'text');
  assert.equal(again.moved, 2);
  assert.equal(again.album.pages.length, 6);
  assert.equal(again.movedTo, 4);
  assert.equal(again.album.pages[4].layout, 'duoH');
  assert.deepEqual(again.album.pages[4].slots.slice(0, 2).map((s) => s.photoId), ['3', '4']);

  // Nenhuma foto some: o conjunto continua o mesmo.
  const ids = (a: typeof album) =>
    a.pages.flatMap((p) => p.slots.map((s) => s.photoId)).filter(Boolean).sort();
  assert.deepEqual(ids(again.album), ['1', '2', '3', '4', '5']);

  // Aumentar a página não move nada.
  const grow = relayoutPage(album, 0, 'quad');
  assert.equal(grow.movedTo, null);
  assert.equal(grow.album.pages.length, 4);
}

console.log('checkAlbumFlow: ok');
