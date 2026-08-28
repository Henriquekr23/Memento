/**
 * Ícones do editor, desenhados aqui.
 *
 * O protótipo usava `lucide-react`. O repositório tem sete dependências de
 * produção e a intenção é continuar assim — um punhado de traços em SVG não
 * justifica um pacote inteiro, e assim eles herdam `currentColor` e a espessura
 * do resto da interface sem configuração.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({
  size = 14,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconType = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7V5h16v2M9 19h6M12 5v14" />
  </Svg>
);

export const IconLayers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5" />
  </Svg>
);

export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4ZM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7V4Z" />
  </Svg>
);

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
  </Svg>
);

export const IconRuler = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3 15 6-6 9 9-6 6-9-9ZM12 6l3-3 6 6-3 3M8 10l2 2M11 7l2 2" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M7 11l5 5 5-5M4 20h16" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="m4 12.6 5.3 5.2L20 7" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Svg>
);

export const IconRotate = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 8a8 8 0 1 0 1 6M20 4v5h-5" />
  </Svg>
);

export const IconAlignLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h10M4 18h13" />
  </Svg>
);

export const IconAlignCenter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M6 18h12" />
  </Svg>
);

export const IconAlignRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M10 12h10M7 18h13" />
  </Svg>
);

export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v14H4zM4 16l4-4 3 3 3-3 6 6" />
    <circle cx="9" cy="9" r="1.4" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 6-6 6 6 6" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="m10 6 6 6-6 6" />
  </Svg>
);

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.8M6.3 7.9A17 17 0 0 0 2 12s3.6 6 10 6a9.6 9.6 0 0 0 3.4-.6" />
  </Svg>
);

export const IconMove = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconWarning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4 2.5 20h19L12 4ZM12 10v4M12 17.2v.1" />
  </Svg>
);

export const IconCloud = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.5 9.5 3.75 3.75 0 0 1 17 18H7Z" />
    <path d="M12 15V9m0 0-2.2 2.2M12 9l2.2 2.2" />
  </Svg>
);
