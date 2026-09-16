import type { ComponentProps, PartData } from '@enonic/react-components';
import type { GalleryItem } from './GalleryItem';
import { RevealImage } from '../shared/RevealImage';

/** CSS multi-column masonry: items flow top-to-bottom, column by column. */
const masonry: React.CSSProperties = {
  columns: 4,
  columnGap: 40,
};

type GalleryProps = ComponentProps<PartData> & {
  /** Blurhash variant: hide each image until decoded, then fade it in over the placeholder. */
  reveal?: boolean;
};

const plainImage: React.CSSProperties = { display: 'block', width: '100%', height: 'auto' };

/**
 * Four-column masonry of lazy-loaded images. When an item has a placeholder it sits behind the
 * <img> as a background, visible until the finished image is shown on top.
 */
export function Gallery({ data, reveal = true }: GalleryProps) {
  const items = (data?.items as GalleryItem[] | undefined) ?? [];
  if (items.length === 0) return <p>No images directly under the chosen folder.</p>;

  return (
    <section style={masonry}>
      {items.map((item) => (
        <figure key={item.url} style={{ margin: '0 0 40px', breakInside: 'avoid' }}>
          <div
            style={{
              // No aspect-ratio here: the <img>'s width/height attributes reserve the space, and a
              // ratio on a bordered box would leave a strip of background under the image.
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundImage: item.placeholder ? `url(${item.placeholder})` : undefined,
              // Average colour from the hash: the image's own tint frames it, before and after load.
              border: item.color ? `8px solid ${item.color}` : undefined,
            }}
          >
            {reveal ? (
              <RevealImage src={item.url} alt={item.alt} width={item.width} height={item.height} />
            ) : (
              <img src={item.url} alt={item.alt} width={item.width} height={item.height} loading="lazy" style={plainImage} />
            )}
          </div>
        </figure>
      ))}
    </section>
  );
}

/** The simple variant: a plain lazy <img>, no placeholder, no reveal. */
export function SimpleGallery(props: ComponentProps<PartData>) {
  return <Gallery {...props} reveal={false} />;
}
