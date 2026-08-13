/** Entrega um Blob ao usuário como download. Compartilhado pelos exportadores. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revogar no mesmo tique cancela o download em alguns navegadores: a URL
  // morre antes de o download começar de fato. Um tique depois é seguro.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
