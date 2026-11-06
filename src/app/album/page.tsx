import { AlbumFlow } from '@/features/album-flow/AlbumFlow';

/**
 * /album: montar um álbum novo, em cinco etapas.
 *
 * O fluxo inteiro mora em `AlbumFlow`, porque reeditar um álbum guardado
 * (`/album/[id]/editar`) passa pelas mesmas etapas, semeadas com ele.
 */
export default function AlbumPage() {
  return <AlbumFlow />;
}
