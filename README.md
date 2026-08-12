# Memento — Keep the Journey

Monta o álbum de uma viagem a partir das fotos: lê os metadados EXIF, ordena por
data/hora, permite reordenar e selecionar manualmente e exporta tudo em ZIP.

**Fase 1 (atual):** 100% client-side. Nenhuma foto sai do navegador, nenhum
backend, nenhum custo de infraestrutura.

## Rodar

```bash
npm install
npm run dev     # http://localhost:3000
```

Outros comandos: `npm run build`, `npm run lint`, `npx tsc --noEmit`.

## Estrutura

```
src/
├── app/                      # Rota única (App Router). page.tsx só compõe as features.
├── features/
│   ├── photo-upload/         # Dropzone + File[] → Photo[] (importPhotos.ts)
│   ├── exif-reader/          # parseExif.ts — exifr → PhotoExif normalizado
│   ├── album-builder/        # useAlbum (estado), AlbumGrid (dnd-kit), AlbumToolbar, PhotoCard
│   └── album-export/         # AlbumExporter (contrato) + zipExporter (JSZip)
├── lib/                      # Funções puras: sortPhotos.ts, format.ts
└── types/                    # Tipos de domínio (Photo, PhotoExif, Album)
```

## Decisões que importam

- **EXIF ausente é a regra, não a exceção.** Prints, imagens editadas e fotos
  vindas de apps de mensagem chegam sem EXIF. Nesses casos o app usa
  `file.lastModified` e marca a foto com o selo "sem EXIF" — o usuário vê que
  aquela data é menos confiável.
- **Ordem manual vence a automática.** Enquanto o usuário não arrasta nada,
  fotos novas entram já reordenadas cronologicamente. Depois do primeiro
  arraste, novas fotos são apenas anexadas ao fim, e a reordenação total só
  acontece se ele clicar no botão de ordenar por data.
- **Incluir ≠ remover.** O olho tira a foto do álbum exportado sem apagá-la da
  lista; o ✕ descarta de vez (e revoga o object URL).
- **ZIP sem compressão** (`STORE`): JPEG já é comprimido, então comprimir de
  novo só gasta CPU. Dentro do ZIP vai um `indice.txt` com data, GPS, câmera e
  nome original de cada foto.
- **Object URLs são revogados** ao remover foto, limpar o álbum e desmontar o
  componente, senão centenas de fotos vazam memória na aba.

## Caminho para a Fase 2

A migração não deve tocar em `exif-reader`, `lib/` nem na UI do
`album-builder`. Os dois pontos de costura já estão isolados:

- `features/album-export/types.ts` define o contrato `AlbumExporter`. Criar um
  `apiAlbumExporter` que faz upload e devolve link público e passá-lo para
  `useAlbumExport()` substitui o ZIP sem mudar componente nenhum.
- `useAlbum` concentra todo o estado do álbum; a persistência entra como um
  efeito adicional, sem alterar o formato do estado.
