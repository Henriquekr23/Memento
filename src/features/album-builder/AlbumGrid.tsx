'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useMemo } from 'react';

import { buildTripDayIndex, toDayKey } from '@/lib/sortPhotos';
import type { Photo } from '@/types/photo';

import { PhotoCard } from './PhotoCard';

interface AlbumGridProps {
  photos: Photo[];
  onReorder: (fromId: string, toId: string) => void;
  onRemove: (id: string) => void;
  onToggleIncluded: (id: string) => void;
}

export function AlbumGrid({
  photos,
  onReorder,
  onRemove,
  onToggleIncluded,
}: AlbumGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tripDays = useMemo(() => buildTripDayIndex(photos), [photos]);

  /** Numeração do álbum: só conta as fotos incluídas. */
  const positions = useMemo(() => {
    const map = new Map<string, number>();
    let counter = 0;
    for (const photo of photos) {
      if (photo.included) {
        counter += 1;
        map.set(photo.id, counter);
      }
    }
    return map;
  }, [photos]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              position={positions.get(photo.id) ?? null}
              tripDay={tripDays.get(toDayKey(photo.timestamp)) ?? null}
              onRemove={onRemove}
              onToggleIncluded={onToggleIncluded}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
