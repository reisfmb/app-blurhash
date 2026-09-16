/**
 * Server side of the two gallery parts: list the images directly under the configured folder
 * (default: the current folder, else the site), in random order, and shape them for <Gallery>. The blurhash variant adds the decoded
 * placeholder and the average colour; the simple one does neither.
 */
import type { PartDescriptor } from '@enonic-types/core';
import type { ComponentProcessor } from '@enonic-types/lib-react4xp/DataFetcher';
import { getChildren } from '/lib/xp/content';
import { getContent, getSite, imageUrl } from '/lib/xp/portal';
import { averageColor, decode } from '/lib/blurhash';
import type { GalleryItem } from './GalleryItem';

type Image = {
  _id: string;
  displayName: string;
  type: string;
  x?: Record<string, Record<string, unknown>>;
};

type GalleryConfig = { folder?: string };

/** `x` namespace the lib writes to: the consuming app's name with dots replaced by dashes. */
const NAMESPACE = app.name.replace(/\./g, '-');

/**
 * Where to look: the configured folder; else the content being rendered when it can hold
 * images (a folder or the site), so a template or auto-resolved page shows each folder's own
 * images with no configuration; else the site.
 */
function parentKey(configured: string | undefined): string | undefined {
  if (configured) return configured;
  const current = getContent();
  if (current && (current.type === 'base:folder' || current.type === 'portal:site')) return current._id;
  return getSite()?._id;
}

function imagesUnder(key: string | undefined): Image[] {
  const parent = parentKey(key);
  if (!parent) return [];
  return (getChildren({ key: parent, count: 100 }).hits as unknown as Image[])
    .filter((c) => c.type === 'media:image');
}

/** Fisher–Yates, in place. Done server-side so SSR markup and hydration see the same order. */
function shuffle<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function toItem(image: Image, withHash: boolean): GalleryItem {
  const info = (image.x?.media?.imageInfo ?? {}) as { imageWidth?: number; imageHeight?: number };
  const width = info.imageWidth || 4;
  const height = info.imageHeight || 3;
  const stored = image.x?.[NAMESPACE]?.blurhash as { hash?: string } | undefined;
  const hash = withHash ? stored?.hash : undefined;

  return {
    url: imageUrl({ id: image._id, scale: 'full' }),
    alt: image.displayName,
    width,
    height,
    // Both null when there is no hash yet, or the stored one is invalid: the <img> still renders.
    placeholder: hash ? decode(hash, { width, height }) : null,
    color: hash ? averageColor(hash) : null,
  };
}

function processor(withHash: boolean): ComponentProcessor<PartDescriptor> {
  return ({ component }) => {
    // `Component` is a union that includes fragments (no config): narrow by shape.
    const config = ((component as { config?: GalleryConfig } | undefined)?.config ?? {}) as GalleryConfig;
    return { items: shuffle(imagesUnder(config.folder)).map((image) => toItem(image, withHash)) };
  };
}

export const blurhashGalleryProcessor = processor(true);
export const simpleGalleryProcessor = processor(false);
