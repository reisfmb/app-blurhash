import type { ComponentProps, PartData } from '@enonic/react-components';
import { useEffect, useRef, useState } from 'react';
import type { GalleryItem } from './GalleryItem';

/** CSS multi-column masonry: items flow top-to-bottom, column by column. */
const masonry: React.CSSProperties = {
  columns: 4,
  columnGap: 40,
};

/**
 * Hidden until fully *decoded*, so neither the network's progressive paint nor the decoder's
 * top-to-bottom paint of a cached image ever shows over the placeholder; the finished image
 * appears in one step. `load` (and `complete`) fire before decoding is done, hence `decode()`.
 * The effect covers images already complete before hydration, when React's onLoad never fires.
 */
function GalleryImage({ item }: { item: GalleryItem }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  const reveal = () => {
    const img = ref.current;
    if (!img) return;
    const show = () => setLoaded(true);
    if (typeof img.decode === 'function') img.decode().then(show, show);
    else show();
  };

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) reveal();
  }, []);

  return (
    <img
      ref={ref}
      src={item.url}
      alt={item.alt}
      width={item.width}
      height={item.height}
      loading="lazy"
      decoding="async"
      onLoad={reveal}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        opacity: loaded ? 1 : 0,
      }}
    />
  );
}

/**
 * Four-column masonry of lazy-loaded images. When an item has a placeholder it sits behind the
 * <img> as a background, visible until the finished image is shown on top.
 */
export function Gallery({ data }: ComponentProps<PartData>) {
  const items = (data?.items as GalleryItem[] | undefined) ?? [];
  if (items.length === 0) return <p>No images directly under the site.</p>;

  return (
    <section style={masonry}>
      {items.map((item) => (
        <figure key={item.url} style={{ margin: '0 0 40px', breakInside: 'avoid' }}>
          <div
            style={{
              aspectRatio: `${item.width} / ${item.height}`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: item.placeholder ? `url(${item.placeholder})` : undefined,
            }}
          >
            <GalleryImage item={item} />
          </div>
        </figure>
      ))}
    </section>
  );
}
