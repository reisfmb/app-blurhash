import type { ComponentProps, PartData } from '@enonic/react-components';
import type { GalleryItem } from './GalleryItem';

/** CSS multi-column masonry: items flow top-to-bottom, column by column. */
const masonry: React.CSSProperties = {
  columns: 4,
  columnGap: 40,
};

/**
 * Four-column masonry of lazy-loaded images. When an item has a placeholder it sits behind the
 * <img> as a background; the browser paints the real image over it natively, top to bottom, as
 * bytes arrive. Both parts use this view: the blurhash one supplies `placeholder` and `color`,
 * the simple one supplies neither.
 */
export function Gallery({ data }: ComponentProps<PartData>) {
  const items = (data?.items as GalleryItem[] | undefined) ?? [];
  if (items.length === 0) return <p>No images directly under the chosen folder.</p>;

  return (
    <section style={masonry}>
      {items.map((item) => (
        <figure key={item.url} style={{ margin: '0 0 40px', breakInside: 'avoid' }}>
          <div
            style={{
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: item.placeholder ? `url(${item.placeholder})` : undefined,
              border: item.color ? `8px solid ${item.color}` : undefined,
            }}
          >
            <img src={item.url} alt={item.alt} width={item.width} height={item.height} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
          </div>
        </figure>
      ))}
    </section>
  );
}
