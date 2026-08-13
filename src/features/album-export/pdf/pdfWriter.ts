/**
 * Escritor de PDF mínimo — sem biblioteca.
 *
 * Por que à mão: cada página do álbum já é uma imagem JPEG pronta (o canvas
 * desenhou tudo, do papel à sombra da foto), e um PDF que só empilha imagens é
 * um arquivo pequeno e bem documentado. Trazer um jsPDF da vida seria ~350 KB
 * no bundle para usar 2% dele. O JPEG entra **cru** no arquivo, via filtro
 * `DCTDecode`: nenhuma recompressão, nenhum byte a mais.
 *
 * Estrutura gerada:
 *
 *   1  Catalog
 *   2  Pages
 *   3  Info
 *   4+ por página: Page · Contents · Image
 *
 * Módulo puro: recebe bytes e devolve bytes, não toca em DOM. Dá para rodar em
 * Node para testar o arquivo sem abrir navegador.
 */

export interface PdfPageInput {
  /** Tamanho da página no papel, em pontos (1 pt = 1/72"). */
  widthPt: number;
  heightPt: number;
  /** A página inteira, já rasterizada. */
  jpeg: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
}

export interface PdfMeta {
  title: string;
  /** Vira o campo Author do arquivo. */
  author?: string;
}

const ASCII = new TextEncoder();

function ascii(value: string): Uint8Array {
  return ASCII.encode(value);
}

/**
 * Texto de PDF com acento.
 *
 * A codificação padrão do formato é Latin-1, que não dá conta de "ç" nem de
 * travessão. Com o BOM `FE FF` na frente, o leitor interpreta a string como
 * UTF-16BE — é o que faz "Ilhéus, férias de verão" aparecer certo no título da
 * janela do leitor de PDF.
 */
function pdfTextString(value: string): Uint8Array {
  const bytes: number[] = [0xfe, 0xff];

  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const units =
      code > 0xffff
        ? [
            0xd800 + ((code - 0x10000) >> 10),
            0xdc00 + ((code - 0x10000) & 0x3ff),
          ]
        : [code];

    for (const unit of units) {
      bytes.push((unit >> 8) & 0xff, unit & 0xff);
    }
  }

  // Escapa o que o parser leria como fim de string ou início de escape.
  const escaped: number[] = [];
  for (const byte of bytes) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) escaped.push(0x5c);
    escaped.push(byte);
  }

  return Uint8Array.from([0x28, ...escaped, 0x29]);
}

/** D:20260813T… no formato que a especificação pede. */
function pdfDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}'${pad(Math.abs(offset) % 60)}'`
  );
}

/**
 * Acumula os pedaços do arquivo guardando o deslocamento de cada objeto — a
 * tabela xref no fim é literalmente a lista desses deslocamentos, e errar um
 * byte aqui é um PDF que não abre.
 */
class ByteWriter {
  private readonly chunks: Uint8Array[] = [];
  private length = 0;

  get offset(): number {
    return this.length;
  }

  push(chunk: Uint8Array | string): void {
    const bytes = typeof chunk === 'string' ? ascii(chunk) : chunk;
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  toBlob(type: string): Blob {
    // BlobPart aceita ArrayBufferView; a cópia extra de um concat seria o dobro
    // de memória num arquivo que já pode ter dezenas de MB.
    return new Blob(this.chunks as BlobPart[], { type });
  }
}

export function buildPdf(
  pages: readonly PdfPageInput[],
  meta: PdfMeta,
): Blob {
  if (pages.length === 0) {
    throw new Error('Um álbum precisa de pelo menos uma página.');
  }

  const writer = new ByteWriter();
  /** offsets[n] = byte em que o objeto n começa. */
  const offsets: number[] = [];

  const objectCount = 3 + pages.length * 3;

  const begin = (id: number) => {
    offsets[id] = writer.offset;
    writer.push(`${id} 0 obj\n`);
  };
  const end = () => writer.push('endobj\n');

  // O cabeçalho binário na segunda linha é a convenção que faz ferramentas de
  // transferência tratarem o arquivo como binário e não corromperem os JPEGs.
  writer.push('%PDF-1.4\n');
  writer.push(Uint8Array.from([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  const pageObjectId = (index: number) => 4 + index * 3;

  begin(1);
  writer.push('<< /Type /Catalog /Pages 2 0 R >>\n');
  end();

  begin(2);
  writer.push(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, index) => `${pageObjectId(index)} 0 R`)
      .join(' ')}] >>\n`,
  );
  end();

  begin(3);
  writer.push('<< /Title ');
  writer.push(pdfTextString(meta.title));
  writer.push(' /Author ');
  writer.push(pdfTextString(meta.author ?? 'Memento'));
  writer.push(' /Producer ');
  writer.push(pdfTextString('Memento — Keep the Journey'));
  writer.push(' /Creator ');
  writer.push(pdfTextString('Memento'));
  writer.push(' /CreationDate ');
  writer.push(pdfTextString(pdfDate(new Date())));
  writer.push(' >>\n');
  end();

  pages.forEach((page, index) => {
    const id = pageObjectId(index);
    const contentsId = id + 1;
    const imageId = id + 2;

    const width = page.widthPt.toFixed(2);
    const height = page.heightPt.toFixed(2);

    begin(id);
    writer.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
        `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> ` +
        `/Contents ${contentsId} 0 R >>\n`,
    );
    end();

    // A matriz `cm` estica a imagem unitária até o tamanho da página: é o que
    // faz a mesma página valer em qualquer resolução de rasterização.
    const stream = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
    begin(contentsId);
    writer.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream\n`);
    end();

    begin(imageId);
    writer.push(
      `<< /Type /XObject /Subtype /Image /Width ${page.pixelWidth} ` +
        `/Height ${page.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    writer.push(page.jpeg);
    writer.push('\nendstream\n');
    end();
  });

  const xrefOffset = writer.offset;
  writer.push(`xref\n0 ${objectCount + 1}\n`);
  writer.push('0000000000 65535 f \n');
  for (let id = 1; id <= objectCount; id += 1) {
    writer.push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  }

  writer.push(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 3 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  return writer.toBlob('application/pdf');
}
