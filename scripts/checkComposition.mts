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
  showPageNumbers: true,
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
      fill: true,
      gap: 0,
      heading: '',
      body: '',
      textBlocks: [
        {
          id: 'tb1',
          text: 'Santorini, 6h12',
          x: 50,
          y: 88,
          width: 76,
          size: 3.6,
          font: 'dm',
          align: 'center',
          color: '#FFFFFF',
          uppercase: false,
          leading: 1.4,
          tracking: 0,
          rotation: 0,
          behind: false,
          backdrop: 'shade',
        },
      ],
      slots: [
        { photoId: 'a', fit: 'cover', zoom: 1.4, offsetX: 5, offsetY: -3 },
        { photoId: null, fit: 'cover', zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, fit: 'cover', zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, fit: 'cover', zoom: 1, offsetX: 0, offsetY: 0 },
      ],
    },
    {
      id: 'p2',
      layout: 'duoH',
      spread: false,
      fill: true,
      gap: 2.5,
      heading: 'Oia',
      body: 'Subimos antes do sol.',
      textBlocks: [],
      slots: [
        { photoId: 'b', fit: 'contain', zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: 'c', fit: 'cover', zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, fit: 'cover', zoom: 1, offsetX: 0, offsetY: 0 },
        { photoId: null, fit: 'cover', zoom: 1, offsetX: 0, offsetY: 0 },
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
assert.equal(
  dirty.album.showPageNumbers,
  true,
  'álbum sem o campo do número de página abre com a numeração ligada',
);
assert.equal(
  dirty.album.pages[0].fill,
  false,
  'página salva antes do preenchimento total não muda de cara ao reabrir',
);
assert.equal(dirty.album.pages[0].gap, 0, 'respiro ausente é zero');
assert.deepEqual(dirty.album.pages[0].textBlocks, [], 'página sem textos abre com a lista vazia');
assert.equal(dirty.album.pages[0].slots[0].fit, 'cover', 'encaixe ausente é preencher');

// ── Texto na página: entrada torta não derruba nem inventa ─────────────────
const messyText = parseComposition({
  version: 2,
  album: {
    pages: [
      {
        layout: 'full',
        textBlocks: [
          { text: 'oi', font: 'comic', align: 'justify', backdrop: 'vidro', size: 999 },
          'isto não é um bloco',
          null,
        ],
      },
    ],
  },
});
const block = messyText.album.pages[0].textBlocks[0];
assert.equal(messyText.album.pages[0].textBlocks.length, 1, 'bloco que não é objeto é descartado');
assert.equal(block.text, 'oi', 'o texto sobrevive');
assert.ok(block.id.length > 0, 'bloco sem id ganha um');
assert.equal(block.font, 'dm', 'fonte desconhecida cai no padrão');
assert.equal(block.align, 'center', 'alinhamento desconhecido cai no padrão');
assert.equal(block.backdrop, 'none', 'fundo desconhecido cai no padrão');
assert.equal(block.size, 100, 'corpo fora da faixa é grampeado');

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
  pruned.album.pages[0].textBlocks[0].text,
  'Santorini, 6h12',
  'a poda de fotos não toca no texto da página',
);
assert.equal(
  pruned.album.pages[1].heading,
  'Oia',
  'texto da página sobrevive à poda — nada escrito pelo usuário se perde',
);

console.log('composition: todos os asserts passaram');
