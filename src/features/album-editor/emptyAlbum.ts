/**
 * O álbum em branco — o estado inicial da composição.
 *
 * Mora fora de `useEditorAlbum.ts` de propósito: aquele arquivo é `'use
 * client'`, e a leitura do álbum salvo (`album-save/composition.ts`) roda no
 * servidor, em `/album/[id]`. Importar uma função pura de dentro de um módulo
 * de cliente faz o build do Next falhar ao coletar a página. Aqui não há React
 * nem navegador: só o documento vazio.
 */

import { DEFAULT_PAPER, type Orientation } from '@/features/album-print/spec';
import { makePage, makeText, type EditorAlbum } from '@/types/album-editor';

import { DEFAULT_COLOR } from './palette';

export function emptyAlbum(orientation: Orientation = 'portrait'): EditorAlbum {
  return {
    name: '',
    orientation,
    paper: DEFAULT_PAPER,
    color: DEFAULT_COLOR,
    elements: [
      makeText({ role: 'title', text: '', size: 30, y: 62, width: 84, tracking: -3 }),
    ],
    back: { show: false, text: '' },
    showPageNumbers: true,
    spine: {
      show: true,
      direction: 'ascending',
      size: null,
      offset: 50,
      showYear: false,
      year: '',
      mm: null,
    },
    pages: Array.from({ length: 8 }, () => makePage()),
  };
}
