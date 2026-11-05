'use client';

import Image from 'next/image';
import Link from 'next/link';

import { COMMON } from '@/features/i18n/common';
import { useLang } from '@/features/i18n/LangProvider';

import { SAMPLE_PHOTO_SIZE } from './sampleTrip';

/**
 * "Montar meu álbum", nas três roupas que a landing usa: laranja sólido (barra,
 * herói, gaveta), claro sobre a seção escura e contorno. Sempre leva a
 * `/album` — é a única ação da página.
 */
export function LandingCta({
  tone = 'solid',
  className,
  onFocus,
}: {
  tone?: 'solid' | 'light';
  className?: string;
  onFocus?: () => void;
}) {
  const { lang } = useLang();
  return (
    <Link
      href="/album"
      onFocus={onFocus}
      className={`lp-btn lp-btn-${tone}${className ? ` ${className}` : ''}`}
    >
      {COMMON[lang].cta}
    </Link>
  );
}

/**
 * Uma foto da viagem de exemplo. `next/image` com largura e altura fixas (sem
 * salto de layout) e `sizes` dizendo o tamanho real na tela, para o servidor
 * de imagens mandar o arquivo menor que serve. Decorativa (`alt=""`): o que a
 * foto ilustra já está escrito na página ao lado.
 */
export function TripImage({
  src,
  sizes,
  preload,
}: {
  src: string;
  sizes: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={SAMPLE_PHOTO_SIZE.width}
      height={SAMPLE_PHOTO_SIZE.height}
      sizes={sizes}
      preload={preload}
      className="lp-img"
      draggable={false}
    />
  );
}
