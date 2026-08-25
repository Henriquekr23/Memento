'use client';

import { PHOTOS_BUCKET } from '@/lib/supabase/env';
import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Photo } from '@/types/photo';

import { prepareUpload, UPLOAD_MIME } from '@/features/album-save/prepareUpload';

import { recordContributions } from './actions';
import type { ContributionInput, InviteTarget } from './contract';

/**
 * O envio do convidado, do lado do navegador.
 *
 * É `saveAlbumToCloud` com duas diferenças, e nenhuma delas está no caminho da
 * imagem: o destino é a subpasta `contrib` do álbum de **outra** pessoa, e no
 * fim não nasce um álbum, nasce uma fila de espera.
 *
 * Todo o resto é reaproveitado inteiro — `importPhotos`, `parseExif` e
 * `prepareUpload`. Em particular o `prepareUpload`: a foto que sobe é uma cópia
 * redesenhada num canvas, sem EXIF. O convidado manda a imagem para o álbum
 * sem mandar junto as coordenadas de GPS de onde ele estava, e o original nunca
 * sai da máquina dele. Essa promessa vale para o convidado exatamente como vale
 * para o dono.
 */

export interface SendProgress {
  processed: number;
  total: number;
}

export type SendResult =
  | { ok: true; sent: number }
  | { ok: false; error: string };

/**
 * Um id em formato UUID, sempre.
 *
 * `importPhotos` cai num id do tipo `photo_ab12…` onde `crypto.randomUUID` não
 * existe (contexto não seguro — abrir o app pelo IP da rede local). Isso é
 * aceitável em `album_photos`, cuja coluna é `text`, mas a contribuição tem
 * coluna `uuid`: um id fora do formato seria recusado pelo banco **depois** de
 * a foto já ter subido. Por isso a contribuição ganha um id próprio, e não
 * reaproveita o da `Photo`.
 */
function uuid(): string {
  // `typeof api.randomUUID === 'function'` em vez de `'randomUUID' in api`: o
  // tipo `Crypto` declara `randomUUID` como obrigatório, então o `in` é sempre
  // verdadeiro para o compilador e o ramo de baixo vira `never`. O que se está
  // checando aqui é o runtime, não o tipo — `randomUUID` só existe em contexto
  // seguro.
  const api = globalThis.crypto as Crypto | undefined;
  if (api && typeof api.randomUUID === 'function') return api.randomUUID();

  const bytes = new Uint8Array(16);
  if (api && typeof api.getRandomValues === 'function') {
    api.getRandomValues(bytes);
  } else {
    // Sem `crypto` nenhum não há como este envio acontecer (o Supabase precisa
    // de fetch e de TLS), mas a função tem de devolver algo válido.
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Versão 4 e variante 10xx, como manda a RFC 4122 — sem isso o valor é
  // aleatório mas não é um UUID, e quem decide isso é o Postgres, não nós.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toIso(date: Date | null | undefined): string | null {
  if (!date) return null;
  const time = date.getTime();
  return Number.isFinite(time) ? date.toISOString() : null;
}

export async function sendContributions(input: {
  target: InviteTarget;
  photos: readonly Photo[];
  onProgress?: (progress: SendProgress) => void;
}): Promise<SendResult> {
  const { target, photos, onProgress } = input;
  if (photos.length === 0) return { ok: false, error: 'Escolha ao menos uma foto.' };

  const supabase = getBrowserSupabase();
  const sent: ContributionInput[] = [];

  onProgress?.({ processed: 0, total: photos.length });

  // Sequencial pelo mesmo motivo de `saveAlbumToCloud`: em paralelo, cada foto
  // grande dobra o pico de memória do navegador e o celular mata a aba.
  for (const [index, photo] of photos.entries()) {
    let prepared;
    try {
      prepared = await prepareUpload(photo);
    } catch {
      return { ok: false, error: `Não foi possível preparar "${photo.fileName}".` };
    }

    const id = uuid();
    // A convenção do caminho é o que a política de Storage lê para decidir se
    // este upload pode acontecer: {dono}/{álbum}/contrib/{id}. Mudou aqui,
    // mude em `supabase/schema.sql` — nos dois lugares em que `contrib` aparece.
    const storagePath = `${target.ownerId}/${target.albumId}/contrib/${id}.jpg`;

    const { error } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, prepared.blob, {
        contentType: UPLOAD_MIME,
        // Sem `upsert`: cada envio tem id novo, então sobrescrever só
        // aconteceria por acidente — e sobrescrever arquivo na pasta de outra
        // pessoa é exatamente o que não queremos permitir.
        upsert: false,
      });

    if (error) {
      return {
        ok: false,
        error:
          sent.length > 0
            ? `Enviei ${sent.length} de ${photos.length} e a conexão falhou. Tente de novo com o que faltou.`
            : 'Falha ao enviar. Verifique a conexão e tente de novo.',
      };
    }

    sent.push({
      id,
      storagePath,
      fileName: photo.fileName,
      width: prepared.width,
      height: prepared.height,
      takenAt: toIso(photo.exif.takenAt ?? photo.timestamp),
      timestampSource: photo.timestampSource,
    });

    onProgress?.({ processed: index + 1, total: photos.length });
  }

  const recorded = await recordContributions({
    albumId: target.albumId,
    photos: sent,
  });
  if (!recorded.ok) return { ok: false, error: recorded.error };

  return { ok: true, sent: recorded.data };
}
