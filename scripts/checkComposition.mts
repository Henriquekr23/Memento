/**
 * Asserts da serialização da composição (Fase 2).
 *
 * Fora do `tsconfig` do app, como o `checkPrintExport`. Roda com:
 *   npx tsx scripts/checkComposition.mts
 *
 * O que está sendo protegido: um álbum salvo hoje precisa abrir amanhã, mesmo
 * que o formato mude. Por isso o parser nunca lança — e é isso que os casos
 * feios abaixo verificam.
 */

import assert from 'node:assert/strict';

import {
  COMPOSITION_VERSION,
  parseComposition,
  photoIdsInComposition,
  pruneComposition,
} from '../src/features/album-save/composition.ts';

const album = {
  name: 'Grécia',
  orientation: 'portrait',
  paper: 'c250',
  color: 'cobalt',
  elements: [
    {
      id: 't1',
      kind: 'text',
      role: 'title',
      text: 'GRÉCIA',
      x: 50,
      y: 62,
      width: 84,
      size: 30,
      font: 'anton',
      align: 'center',
      uppercase: true,
      tracking: -3,
      leading: 0.9,
      rotation: 0,
      color: null,
    },
    {
      id: 'm1',
      kind: 'motif',
      shape: 'eye',
      x: 50,
      y: 30,
      size: 58,
      rotation: 0,
      color: null,
    },
  ],
  back: { show: true, text: 'Onze dias.' },
  spine: {
    show: true,
    direction: 'ascending',
    size: null,
    offset: 50,
    showYear: true,
    year: '2026',
    mm: null,
  },
  pages: [
    {
      id: 'p1',
      layout: 'full',
      spread: false,
      heading: '',
      body: '',
      slots: [
        { photoId: 'a', zoom: 1.4, offsetX: 5, offsetY: -3 },
        { photoId: null, zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, zoom: 1, offsetX: 0, offsetY: 0 },
      ],
    },
    {
      id: 'p2',
      layout: 'duoH',
      spread: false,
      heading: 'Oia',
      body: 'Subimos antes do sol.',
      slots: [
        { photoId: 'b', zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: 'c', zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, zoom: 1, offsetX: 0, offsetY: 0 },
      ],
    },
  ],
};

const full = { version: COMPOSITION_VERSION, album };

// ── Ida e volta ────────────────────────────────────────────────────────────
const roundTrip = parseComposition(JSON.parse(JSON.stringify(full)));
assert.deepEqual(roundTrip, full, 'ida e volta pelo JSON deve preservar tudo');

// ── Entradas quebradas não derrubam o álbum ────────────────────────────────
for (const broken of [null, 'nada disso', [1, 2, 3], undefined, 42]) {
  const parsed = parseComposition(broken);
  assert.equal(parsed.version, COMPOSITION_VERSION);
  assert.ok(parsed.album.pages.length > 0, 'sempre sobra álbum para abrir');
}

const dirty = parseComposition({
  version: 2,
  album: {
    color: 'ouro',
    paper: 'papel-de-seda',
    orientation: 'diagonal',
    elements: [
      { kind: 'text', role: 'free', text: 'ok', font: 'comic', align: 'justify', zoom: 9 },
      { kind: 'motif', shape: 'triângulo', size: 'grande' },
      'isto não é um elemento',
    ],
    spine: { direction: 'para-tras', offset: 900, mm: 'grossa' },
    pages: [{ layout: 'inexistente', slots: [{ photoId: 42 }] }],
  },
});

assert.equal(dirty.album.color, 'sky', 'cor desconhecida cai no padrão');
assert.equal(dirty.album.paper, 'c170', 'papel desconhecido cai no padrão');
assert.equal(dirty.album.orientation, 'portrait', 'orientação desconhecida cai no padrão');
assert.equal(dirty.album.pages[0].layout, 'full', 'layout desconhecido cai no padrão');
assert.equal(dirty.album.pages[0].slots.length, 4, 'a página sempre tem quatro quadros');
assert.equal(dirty.album.pages[0].slots[0].photoId, null, 'id que não é texto vira vazio');
assert.equal(dirty.album.spine.direction, 'ascending', 'direção desconhecida cai no padrão');
assert.equal(dirty.album.spine.offset, 100, 'porcentagem fora da faixa é grampeada');
assert.equal(dirty.album.spine.mm, null, 'espessura que não é número vira calculada');

const textElement = dirty.album.elements.find((el) => el.kind === 'text' && el.text === 'ok');
assert.ok(textElement, 'elemento de texto válido sobrevive');
assert.equal(textElement.font, 'anton', 'fonte desconhecida cai no padrão');
assert.equal(textElement.align, 'center', 'alinhamento desconhecido cai no padrão');

assert.ok(
  dirty.album.elements.some((el) => el.kind === 'text' && el.role === 'title'),
  'álbum sem título ganha um: é ele que a lombada reflete',
);
assert.ok(
  dirty.album.elements.every((el) => typeof el === 'object'),
  'entrada que não é objeto é descartada',
);

// ── Álbum da versão 1 abre, ainda que sem a composição antiga ──────────────
const legacy = parseComposition({
  version: 1,
  layoutOverrides: { 'page-1': 'quad' },
  theme: { cover: 'navy' },
});
assert.equal(legacy.version, COMPOSITION_VERSION, 'a versão é atualizada na leitura');
assert.ok(legacy.album.pages.length > 0, 'álbum antigo abre com páginas vazias, não em branco');

// ── Poda: quadro que aponta para foto não salva fica vazio ─────────────────
assert.deepEqual(
  photoIdsInComposition(full).sort(),
  ['a', 'b', 'c'],
  'as fotos usadas são exatamente as dos quadros',
);

const pruned = pruneComposition(parseComposition(full), ['a']);
assert.equal(pruned.album.pages[0].slots[0].photoId, 'a', 'foto salva permanece no quadro');
assert.equal(pruned.album.pages[1].slots[0].photoId, null, 'foto ausente sai do quadro');
assert.equal(
  pruned.album.pages[0].slots[0].zoom,
  1.4,
  'o enquadramento do quadro que ficou não é mexido',
);
assert.equal(
  pruned.album.pages[1].heading,
  'Oia',
  'texto da página sobrevive à poda — nada escrito pelo usuário se perde',
);

console.log('composition: todos os asserts passaram');
