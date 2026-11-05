/**
 * Asserts da landing: o herói que vira páginas e a seção "Da bagunça ao
 * álbum" — as duas são contas puras alimentadas pela rolagem.
 *
 * Fora do `tsconfig` do app, como os outros. Roda com:
 *   npx tsx scripts/checkLanding.mts
 *
 * O que está sendo protegido: cada folha vira inteira e na ordem, com pausa
 * entre uma e outra; o fundo nunca mostra duas camadas pela metade; o menu só
 * abre com o álbum aberto até o fim; e cada foto organizada entra no álbum na
 * vaga certa, sem duas fotos no mesmo lugar.
 */

import assert from 'node:assert/strict';

import {
  followProgress,
  heroProgress,
  heroState,
  LEAVES,
  spreadProgress,
  TINT_LAYERS,
} from '../src/features/landing/hero-album/heroScroll.ts';
import { activeSectionAt } from '../src/features/landing/nav/activeSection.ts';
import {
  albumPose,
  completeDays,
  dayPose,
  GEOMETRY,
  indexByDay,
  ORGANIZE_CAPACITY,
  organizePhase,
  phaseScroll,
  pilePose,
  placePhotos,
} from '../src/features/landing/organize/organizeGeometry.ts';
import { daySpan, filmStamp, SAMPLE_TRIP, shortCoordinates } from '../src/features/landing/sampleTrip.ts';
import { clamp, easeInOutCubic, seg } from '../src/features/landing/scrollMath.ts';
import { groupPhotosByDay, sortPhotosChronologically } from '../src/lib/sortPhotos.ts';

const near = (a: number, b: number, msg: string, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${msg} (${a} ≠ ${b})`);

/* ── curvas ─────────────────────────────────────────────────────────────── */
{
  near(easeInOutCubic(0), 0, 'a curva começa em 0');
  near(easeInOutCubic(0.5), 0.5, 'passa pelo meio');
  near(easeInOutCubic(1), 1, 'termina em 1');
  near(clamp(-3, 0, 1), 0, 'clamp por baixo');
  near(clamp(9, 0, 1), 1, 'clamp por cima');
  // Pausa de 20% nas duas pontas do trecho.
  near(seg(0.05, 0, 0.25), 0, 'nos primeiros 20% do trecho a folha não se mexe');
  near(seg(0.2, 0, 0.25), 1, 'nos últimos 20% ela já assentou');
}

/* ── herói ──────────────────────────────────────────────────────────────── */
{
  const closed = heroState(0, false);
  assert.deepEqual(closed.f, [0, 0, 0, 0], 'no topo nenhuma folha virou');
  assert.deepEqual(closed.tints, [1, 0, 0, 0, 0], 'e só o tom da capa está aceso');
  assert.equal(closed.finished, false, 'menu fechado com o livro fechado');
  assert.deepEqual(closed.z, [30, 29, 28, 27], 'a capa fica por cima da pilha da direita');

  const open = heroState(1, false);
  assert.deepEqual(open.f, [1, 1, 1, 1], 'no fim todas viraram');
  assert.deepEqual(open.z, [40, 41, 42, 43], 'e a última a cair fica por cima da esquerda');
  assert.equal(open.finished, true, 'menu aberto no fim');
  assert.equal(open.tints.length, TINT_LAYERS);
  assert.equal(open.tints[0], 1, 'a camada de baixo nunca apaga');
  assert.equal(open.tints[TINT_LAYERS - 1], 1, 'o último tom está aceso');

  // As folhas viram uma de cada vez, na ordem.
  for (let p = 0; p <= 1; p += 0.01) {
    const { f, tints } = heroState(p, false);
    for (let i = 1; i < LEAVES; i++) {
      assert.ok(f[i] <= f[i - 1] + 1e-12, `folha ${i} não pode passar a ${i - 1} (p=${p})`);
      assert.ok(f[i] === 0 || f[i - 1] === 1, `folha ${i} só começa depois da ${i - 1} assentar (p=${p})`);
    }
    // No máximo uma camada "pela metade" de cada vez, e entre 0 e 1.
    const partial = tints.filter((t) => t > 0 && t < 1);
    assert.ok(partial.length <= 1, `duas camadas pela metade em p=${p}`);
    tints.forEach((t) => assert.ok(t >= 0 && t <= 1, `opacidade fora de 0..1 em p=${p}`));
  }

  // Cada abertura tem um ponto de rolagem em que tudo está parado.
  for (let opening = 1; opening <= LEAVES; opening++) {
    const p = spreadProgress(opening);
    const { f } = heroState(p, false);
    f.forEach((v, i) =>
      assert.equal(v, i < opening ? 1 : 0, `abertura ${opening} parada: folha ${i} = ${v}`),
    );
  }

  // Movimento reduzido: degrau, nunca meio-termo.
  for (let p = 0; p <= 1; p += 0.01) {
    heroState(p, true).f.forEach((v) => assert.ok(v === 0 || v === 1, `degrau em p=${p}`));
  }

  near(heroProgress(-50, 2800), 0, 'antes do herói, progresso 0');
  near(heroProgress(1400, 2800), 0.5, 'no meio do trecho, 0,5');
  near(heroProgress(9000, 2800), 1, 'depois do herói, 1');
  near(heroProgress(100, 0), 0, 'trecho de comprimento zero não divide por zero');
}

/* ── o livro persegue a rolagem ─────────────────────────────────────────── */
{
  near(followProgress(0.5, 0.5, 16), 0.5, 'parado no alvo, fica');
  const step = followProgress(0, 1, 1000 / 60);
  assert.ok(step > 0 && step <= 1 / 1600 * (1000 / 60) + 1e-12, `um salto de rolagem não vira salto de página (${step})`);
  // Do livro fechado ao aberto, um "flick" leva pelo menos 1,6 s.
  let p = 0;
  let ms = 0;
  while (p < 1 && ms < 10_000) {
    p = followProgress(p, 1, 1000 / 60);
    ms += 1000 / 60;
  }
  assert.equal(p, 1, 'chega no alvo');
  assert.ok(ms >= 1600, `o livro inteiro levou só ${ms} ms`);
  // 30 e 120 fps andam a mesma coisa em 100 ms.
  let a = 0.4;
  let b = 0.4;
  for (let i = 0; i < 3; i++) a = followProgress(a, 0.45, 100 / 3);
  for (let i = 0; i < 12; i++) b = followProgress(b, 0.45, 100 / 12);
  near(a, b, 'independente da taxa de quadros', 2e-3);
  assert.ok(followProgress(0.6, 0.2, 16) < 0.6, 'volta quando a rolagem volta');
}

/* ── viagem de exemplo ──────────────────────────────────────────────────── */
const days = groupPhotosByDay(sortPhotosChronologically(SAMPLE_TRIP));
const items = indexByDay(days);
{
  assert.equal(SAMPLE_TRIP.length, 12, 'doze fotos');
  assert.equal(days.length, 8, 'oito dias com foto');
  assert.equal(daySpan(SAMPLE_TRIP), 9, 'nove dias de viagem, de 14 a 22');
  assert.deepEqual(
    items.map((i) => [i.day, i.k]),
    [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [5, 0], [6, 0], [6, 1], [7, 0]],
    'dia e vaga saem do agrupamento por data, iguais ao protótipo',
  );
  assert.equal(filmStamp(new Date(2026, 2, 15, 11, 20)), "'26 3 15");
  assert.equal(filmStamp(new Date(2026, 2, 15, 11, 20), true), "'26 3 15  11:20");
  assert.equal(
    shortCoordinates({ latitude: -33.046, longitude: -71.619 }, { north: 'N', south: 'S', east: 'L', west: 'O' }),
    '33.046° S, 71.619° O',
  );
  for (const day of days) {
    assert.ok(day.photos.length <= ORGANIZE_CAPACITY.perDay, 'nenhum dia passa de duas fotos');
  }
}

/* ── organizar ──────────────────────────────────────────────────────────── */
for (const layout of ['desktop', 'mobile'] as const) {
  const g = GEOMETRY[layout];
  const none = items.map(() => false);
  const all = items.map(() => true);

  // Nada organizado: todo mundo na pilha, nada vai para o álbum.
  placePhotos(g, items, none).forEach((p, i) => {
    assert.deepEqual(p.outer, pilePose(g, i), `${layout}: foto ${i} na pilha`);
    assert.equal(p.toAlbum, null, `${layout}: foto ${i} bagunçada não entra no álbum`);
  });

  // Tudo organizado: posições de álbum únicas, em ordem de leitura.
  const placed = placePhotos(g, items, all);
  const albumCenters = placed.map((p, i) => {
    const day = dayPose(g, items[i].day, items[i].k);
    assert.deepEqual(p.outer, day, `${layout}: foto ${i} no dia certo`);
    assert.ok(p.toAlbum, `${layout}: foto ${i} organizada entra no álbum`);
    // O interno herda a escala do externo: deslocamento × escala do dia = distância real.
    return {
      x: day.x + p.toAlbum!.dx * g.dayScale,
      y: day.y + p.toAlbum!.dy * g.dayScale,
      scale: g.dayScale * (1 + p.toAlbum!.k),
    };
  });
  albumCenters.forEach((c, rank) => {
    const target = albumPose(g, rank);
    near(c.x, target.x, `${layout}: x da foto ${rank} no álbum`, 1e-6);
    near(c.y, target.y, `${layout}: y da foto ${rank} no álbum`, 1e-6);
    near(c.scale, g.albumScale, `${layout}: escala no álbum`, 1e-9);
  });
  const keys = new Set(albumCenters.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`));
  assert.equal(keys.size, items.length, `${layout}: duas fotos na mesma vaga do álbum`);

  // Fotos no álbum dentro do livro desenhado.
  albumCenters.forEach((c, rank) => {
    const halfW = (g.photo.w * g.albumScale) / 2;
    const halfH = (g.photo.h * g.albumScale) / 2;
    assert.ok(c.x - halfW >= g.album.x && c.x + halfW <= g.album.x + g.album.w, `${layout}: foto ${rank} sai do livro na largura`);
    assert.ok(c.y - halfH >= g.album.y && c.y + halfH <= g.album.y + g.album.h, `${layout}: foto ${rank} sai do livro na altura`);
  });

  // Fotos no dia e na pilha dentro do palco (com folga para o giro da pilha).
  placed.forEach((p, i) => {
    const halfW = (g.photo.w * g.dayScale) / 2;
    assert.ok(p.outer.x - halfW >= 0 && p.outer.x + halfW <= g.stage.w, `${layout}: foto ${i} no dia sai do palco`);
  });

  // Só as organizadas entram, em ordem entre elas: a 3ª foto organizada vai
  // para a 1ª vaga se for a única.
  const onlyThird = items.map((_, i) => i === 2);
  const lone = placePhotos(g, items, onlyThird)[2];
  const loneDay = dayPose(g, items[2].day, items[2].k);
  near(loneDay.x + lone.toAlbum!.dx * g.dayScale, albumPose(g, 0).x, `${layout}: única foto vai para a 1ª vaga`, 1e-6);
}

{
  const half = items.map((_, i) => i < 2);
  assert.deepEqual(
    completeDays(items, half, days.length),
    [true, false, false, false, false, false, false, false],
    'só o primeiro dia está completo com as duas primeiras fotos',
  );
  const missingOne = items.map((_, i) => i !== 1);
  assert.equal(completeDays(items, missingOne, days.length)[0], false, 'dia com uma foto faltando não mostra o rótulo');
}

{
  for (const layout of ['desktop', 'mobile'] as const) {
    const start = organizePhase(0, layout, false);
    assert.equal(start.q, 0, `${layout}: começa organizando`);
    assert.equal(start.album, false);
    const end = organizePhase(phaseScroll(layout, true), layout, false);
    assert.equal(end.q, 1, `${layout}: termina no álbum`);
    assert.equal(end.qa, 1);
    assert.equal(end.qt, 1);
    assert.equal(end.album, true);
    for (let y = 0; y < 2000; y += 25) {
      const r = organizePhase(y, layout, true);
      assert.ok(r.q === 0 || r.q === 1, `${layout}: degrau com movimento reduzido (y=${y})`);
    }
  }
}

/* ── seção ativa do menu ────────────────────────────────────────────────── */
{
  const tops = [0, 3700, 6100, 7200];
  assert.equal(activeSectionAt(tops, 0, 900, 9000), 0, 'topo: Como funciona');
  assert.equal(activeSectionAt(tops, 3400, 900, 9000), 1, 'seção escura passando da linha: Organizar');
  assert.equal(activeSectionAt(tops, 6000, 900, 9000), 2, 'Antes e depois');
  assert.equal(activeSectionAt(tops, 8100, 900, 9000), 3, 'fim da página: Perguntas');
}

console.log('landing: todos os asserts passaram');
