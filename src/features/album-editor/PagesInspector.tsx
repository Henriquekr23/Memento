'use client';

import { paperById } from '@/features/album-print/spec';
import { formatMm } from '@/lib/format';
import { EDITOR_LAYOUTS, layoutById, type EditorLayoutId } from '@/types/album-editor';
import type { Photo } from '@/types/photo';

import type { EditorCopy } from './copy';
import type { EditorAlbumState } from './useEditorAlbum';
import { Group, Row, Seg, Slider } from './controls';
import { IconImage, IconTrash, IconX } from './icons';
import { LayoutIcon } from './LayoutIcon';
import { PHOTO_DND_TYPE } from './PageContent';

const LAYOUT_LABEL: Record<EditorLayoutId, keyof EditorCopy> = {
  full: 'layoutFull',
  inset: 'layoutInset',
  duoV: 'layoutDuoV',
  duoH: 'layoutDuoH',
  trio: 'layoutTrio',
  quad: 'layoutQuad',
  text: 'layoutText',
};

interface PagesInspectorProps {
  state: EditorAlbumState;
  copy: EditorCopy;
  photos: Photo[];
  leftIndex: number;
  rightIndex: number;
  activeSide: 'left' | 'right';
  onActiveSide: (side: 'left' | 'right') => void;
  selectedSlot: number;
  onUpload: (files: File[]) => void;
}

/** Controles da folha aberta, dos quadros e da bandeja de fotos. */
export function PagesInspector({
  state,
  copy,
  photos,
  leftIndex,
  rightIndex,
  activeSide,
  onActiveSide,
  selectedSlot,
  onUpload,
}: PagesInspectorProps) {
  const { album, updatePage, updateFrame, removeSheet, usedPhotoIds, minPages } = state;

  const leftPage = album.pages[leftIndex];
  const activeIndex = activeSide === 'left' ? leftIndex : rightIndex;
  const activePage = album.pages[activeIndex] ?? leftPage;
  if (!leftPage || !activePage) return null;

  const capacity = layoutById(activePage.layout).slots;
  const slotIndex = Math.min(Math.max(selectedSlot, 0), Math.max(0, capacity - 1));

  // Na folha espelhada só existe um quadro, e ele mora na página da esquerda.
  const framePage = leftPage.spread ? leftIndex : activeIndex;
  const frameSlot = leftPage.spread ? 0 : slotIndex;
  const frame = album.pages[framePage].slots[frameSlot];

  const paper = paperById(album.paper);

  return (
    <>
      <Group
        title={copy.sheetGroup}
        right={<span className="ae-meta">{copy.sheetRange(leftIndex + 1, rightIndex + 1)}</span>}
      >
        <Row label={copy.sheetSpread} hint={copy.sheetSpreadHint}>
          <Seg<boolean>
            full
            value={leftPage.spread}
            onChange={(spread) => updatePage(leftIndex, { spread })}
            options={[
              { value: false, label: copy.no },
              { value: true, label: copy.yes },
            ]}
          />
        </Row>
        {!leftPage.spread && (
          <Row label={copy.sheetEditing}>
            <Seg<'left' | 'right'>
              full
              value={activeSide}
              onChange={onActiveSide}
              options={[
                { value: 'left', label: copy.pageLabel(leftIndex + 1) },
                { value: 'right', label: copy.pageLabel(rightIndex + 1) },
              ]}
            />
          </Row>
        )}
      </Group>

      {!leftPage.spread && (
        <Group title={copy.pageLabel(activeIndex + 1)}>
          <div className="ae-layouts">
            {EDITOR_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                className={activePage.layout === layout.id ? 'is-on' : ''}
                onClick={() => updatePage(activeIndex, { layout: layout.id })}
                title={copy[LAYOUT_LABEL[layout.id]] as string}
                aria-pressed={activePage.layout === layout.id}
              >
                <LayoutIcon id={layout.id} />
              </button>
            ))}
          </div>
          <p className="ae-note">
            {copy.layoutNote(copy[LAYOUT_LABEL[activePage.layout]] as string)}
          </p>

          {activePage.layout === 'text' && (
            <>
              <input
                className="ae-input"
                value={activePage.heading}
                placeholder={copy.pageHeadingPlaceholder}
                aria-label={copy.pageHeadingPlaceholder}
                onChange={(event) => updatePage(activeIndex, { heading: event.target.value })}
              />
              <textarea
                className="ae-input"
                rows={4}
                value={activePage.body}
                placeholder={copy.pageBodyPlaceholder}
                aria-label={copy.pageBodyPlaceholder}
                onChange={(event) => updatePage(activeIndex, { body: event.target.value })}
              />
            </>
          )}
        </Group>
      )}

      {(leftPage.spread || capacity > 0) && (
        <Group
          title={
            leftPage.spread
              ? copy.spreadPhotoGroup
              : copy.frameGroup(slotIndex + 1, capacity)
          }
        >
          <Row label={copy.fieldZoom}>
            <Slider
              value={frame.zoom}
              min={1}
              max={3}
              step={0.02}
              label={copy.fieldZoom}
              onChange={(zoom) => updateFrame(framePage, frameSlot, { zoom })}
            />
          </Row>
          <p className="ae-note">{copy.frameNote}</p>
          {frame.photoId && (
            <button
              type="button"
              className="ae-danger"
              onClick={() =>
                updateFrame(framePage, frameSlot, {
                  photoId: null,
                  zoom: 1,
                  offsetX: 0,
                  offsetY: 0,
                })
              }
            >
              <IconX size={12} /> {copy.clearFrame}
            </button>
          )}
        </Group>
      )}

      <Group
        title={copy.trayGroup}
        right={
          <label className="ae-chip" style={{ cursor: 'pointer' }}>
            <IconImage size={12} /> {copy.trayUpload}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                onUpload(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
          </label>
        }
      >
        {photos.length === 0 ? (
          <p className="ae-note">{copy.trayEmpty}</p>
        ) : (
          <>
            <div className="ae-tray">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className={usedPhotoIds.has(photo.id) ? 'is-on' : ''}
                  onClick={() =>
                    updateFrame(framePage, frameSlot, {
                      photoId: photo.id,
                      zoom: 1,
                      offsetX: 0,
                      offsetY: 0,
                    })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={photo.fileName}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData(PHOTO_DND_TYPE, photo.id)
                    }
                  />
                </button>
              ))}
            </div>
            <p className="ae-note">{copy.trayNote}</p>
          </>
        )}
      </Group>

      <Group title={copy.innerGroup}>
        <button
          type="button"
          className="ae-danger"
          disabled={album.pages.length <= minPages}
          onClick={() => removeSheet(leftIndex)}
        >
          <IconTrash size={12} /> {copy.removeSheet}
        </button>
        <p className="ae-note">{copy.innerNote(formatMm(paper.mm, 2))}</p>
      </Group>
    </>
  );
}
