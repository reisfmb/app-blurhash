import type { ComponentProps, PartData } from '@enonic/react-components';
import type { ImageItem } from '../shared/imageTypes';

type HeroData = { title: string; text: string; image: ImageItem | null };

const imageStyle: React.CSSProperties = { display: 'block', width: '100%', height: 'auto' };

/** Black or white, whichever reads better on `#rrggbb` (WCAG relative luminance). */
function textColorOn(background: string): string {
  const n = parseInt(background.slice(1), 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return luminance > 0.4 ? '#000' : '#fff';
}

/**
 * Title and text on the left (60%), image on the right (40%). The section's background is the
 * image's dominant colour when the hash is available, else black. The placeholder sits behind
 * the <img>; the browser paints the real image over it natively as bytes arrive. Both parts use
 * this view: the blurhash one supplies `placeholder` and `color`, the simple one neither.
 */
export function Hero({ data }: ComponentProps<PartData>) {
  const { title, text, image } = (data ?? {}) as Partial<HeroData>;
  const background = image?.color ?? '#000';
  const color = textColorOn(background);

  return (
    <section style={{ display: 'flex', alignItems: 'center', gap: 48, padding: 48, background, color }}>
      <div style={{ flex: '0 0 60%' }}>
        {title && <h1 style={{ margin: '0 0 16px', fontSize: 48, lineHeight: 1.1 }}>{title}</h1>}
        {text && <p style={{ margin: 0, fontSize: 20, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{text}</p>}
      </div>
      <div style={{ flex: '0 0 40%', minWidth: 0 }}>
        {image ? (
          <div
            style={{
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: image.placeholder ? `url(${image.placeholder})` : undefined,
            }}
          >
            <img src={image.url} alt={image.alt} width={image.width} height={image.height} loading="lazy" style={imageStyle} />
          </div>
        ) : (
          <p style={{ margin: 0, opacity: 0.6 }}>No image selected.</p>
        )}
      </div>
    </section>
  );
}

