/**
 * Asserts do replanejamento das fotos ao reeditar um álbum (Fase 3 · A3).
 *
 * Fora do `tsconfig` do app, como os outros. Roda com:
 *   npx tsx scripts/checkAlbumEdit.mts
 *
 * O que está sendo protegido: reeditar não pode custar o upload do álbum
 * inteiro, e a foto que sai do álbum não pode ficar ocupando o bucket para
 * sempre. As duas coisas são o mesmo cálculo, e ele é o que está aqui.
 */

import assert from 'node:assert/strict';

import { planPhotoSync } from '../src/features/album-edit/plan.ts';

const stored = [
  { id: 'foto-uma', storagePath: 'dono/album/foto-uma.jpg' },
  { id: 'foto-dois', storagePath: 'dono/album/foto-dois.jpg' },
  { id: 'foto-tres', storagePath: 'dono/album/foto-tres.jpg' },
];

// Só mexer na composição: nada sobe e nada é apagado.
{
  const plan = planPhotoSync(stored, ['foto-tres', 'foto-uma', 'foto-dois']);
  assert.deepEqual(plan.newIds, []);
  assert.deepEqual(plan.removed, []);
  assert.equal(plan.keptIds.length, 3);
}

// Uma foto nova e uma removida.
{
  const plan = planPhotoSync(stored, ['foto-uma', 'foto-quatro', 'foto-tres']);
  assert.deepEqual(plan.newIds, ['foto-quatro']);
  assert.deepEqual(
    plan.removed.map((photo) => photo.storagePath),
    ['dono/album/foto-dois.jpg'],
  );
}

// Álbum esvaziado: tudo sai do bucket.
{
  const plan = planPhotoSync(stored, []);
  assert.equal(plan.removed.length, 3);
  assert.deepEqual(plan.keptIds, []);
}

// Álbum novo em folha (nada guardado ainda): tudo é upload.
{
  const plan = planPhotoSync([], ['a-nova', 'b-nova']);
  assert.deepEqual(plan.newIds, ['a-nova', 'b-nova']);
  assert.deepEqual(plan.removed, []);
}

// Id repetido na lista final não vira duas posições nem dois uploads — e,
// sobretudo, não faz a foto ser contada como removida por engano.
{
  const plan = planPhotoSync(stored, ['foto-uma', 'foto-uma', 'foto-nova', 'foto-nova']);
  assert.deepEqual(plan.keptIds, ['foto-uma']);
  assert.deepEqual(plan.newIds, ['foto-nova']);
  assert.deepEqual(
    plan.removed.map((photo) => photo.id),
    ['foto-dois', 'foto-tres'],
  );
}

console.log('checkAlbumEdit: ok');
