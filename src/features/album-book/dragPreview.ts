import type { Modifier } from '@dnd-kit/core';
import { getEventCoordinates } from '@dnd-kit/utilities';

/**
 * Gruda a prévia do arraste no cursor.
 *
 * Por padrão o dnd-kit posiciona a prévia a partir do retângulo medido do
 * elemento arrastado. As fotos ficam dentro do livro, que tem `perspective` e
 * `translateX` — sob transformação 3D essa medida não corresponde ao que o
 * usuário vê, e a prévia nascia longe do ponteiro.
 *
 * Ancorar no cursor resolve pela raiz: não importa onde o navegador acha que o
 * elemento está, a prévia aparece exatamente onde está a mão do usuário.
 */
export const snapToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  if (!draggingNodeRect || !activatorEvent) return transform;

  const coordinates = getEventCoordinates(activatorEvent);
  if (!coordinates) return transform;

  const offsetX = coordinates.x - draggingNodeRect.left;
  const offsetY = coordinates.y - draggingNodeRect.top;

  return {
    ...transform,
    x: transform.x + offsetX - draggingNodeRect.width / 2,
    y: transform.y + offsetY - draggingNodeRect.height / 2,
  };
};
