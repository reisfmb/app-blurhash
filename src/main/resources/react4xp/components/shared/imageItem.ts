/**
 * Server-side reading of one `media:image` content into what the views need. Shared by the
 * gallery and hero processors.
 */
import { get as getContentByKey } from '/lib/xp/content';
import { imageUrl } from '/lib/xp/portal';
import { averageColor, decode } from '/lib/blurhash';
import type { ImageItem } from './imageTypes';

export type ImageContent = {
  _id: string;
  displayName: string;
  type: string;
  x?: Record<string, Record<string, unknown>>;
};

export type { ImageItem };

/** `x` namespace the lib writes to: the consuming app's name with dots replaced by dashes. */
const NAMESPACE = app.name.replace(/\./g, '-');

export function toImageItem(image: ImageContent, withHash: boolean): ImageItem {
  const info = (image.x?.media?.imageInfo ?? {}) as { imageWidth?: number; imageHeight?: number };
  const width = info.imageWidth || 4;
  const height = info.imageHeight || 3;
  const stored = image.x?.[NAMESPACE]?.blurhash as { hash?: string } | undefined;
  const hash = withHash ? stored?.hash : undefined;

  return {
    url: imageUrl({ id: image._id, scale: 'full' }), // longest side capped, ratio kept
    alt: image.displayName,
    width,
    height,
    placeholder: hash ? decode(hash, { width, height }) : null,
    color: hash ? averageColor(hash) : null,
  };
}

export function imageItemById(id: string | undefined, withHash: boolean): ImageItem | null {
  if (!id) return null;
  const image = getContentByKey({ key: id }) as unknown as ImageContent | null;
  if (!image || image.type !== 'media:image') return null;
  return toImageItem(image, withHash);
}
