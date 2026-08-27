import type { EditorLayoutId } from '@/types/album-editor';

/**
 * O layout desenhado em barras, não escrito por extenso.
 * Um nome ("uma + duas") exige leitura; a forma se reconhece de relance — e o
 * seletor cabe em quatro colunas do inspetor.
 */
export function LayoutIcon({ id }: { id: EditorLayoutId }) {
  const bar = (style?: React.CSSProperties) => <i style={style} />;

  if (id === 'full') return bar({ height: '100%' });

  if (id === 'inset') {
    return (
      <span style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        {bar({ width: '72%', height: '72%' })}
      </span>
    );
  }

  if (id === 'duoV') {
    return (
      <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: '100%' }}>
        {bar({ height: '100%' })}
        {bar({ height: '100%' })}
      </span>
    );
  }

  if (id === 'duoH') {
    return (
      <span style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2, height: '100%' }}>
        {bar()}
        {bar()}
      </span>
    );
  }

  if (id === 'trio') {
    return (
      <span style={{ display: 'grid', gridTemplateRows: '1.4fr 1fr', gap: 2, height: '100%' }}>
        {bar()}
        <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {bar()}
          {bar()}
        </span>
      </span>
    );
  }

  if (id === 'quad') {
    return (
      <span style={{ display: 'grid', gridTemplate: '1fr 1fr / 1fr 1fr', gap: 2, height: '100%' }}>
        {bar()}
        {bar()}
        {bar()}
        {bar()}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'grid',
        gap: 2,
        alignContent: 'center',
        height: '100%',
        padding: '0 3px',
      }}
    >
      {bar({ height: 2 })}
      {bar({ height: 2 })}
      {bar({ height: 2, width: '60%' })}
    </span>
  );
}
