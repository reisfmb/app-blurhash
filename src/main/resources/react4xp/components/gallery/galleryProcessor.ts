/**
 * Server side of the two gallery parts: list the images directly under the configured folder
 * (default: the current folder, else the site), in random order, and shape them for <Gallery>. The blurhash variant adds the decoded
 * placeholder and the average colour; the simple one does neither.
 */
import type { PartDescriptor } from '@enonic-types/core';
import type { ComponentProcessor } from '@enonic-types/lib-react4xp/DataFetcher';
import { getChildren } from '/lib/xp/content';
import { getContent, getSite } from '/lib/xp/portal';
import { toImageItem, type ImageContent as Image } from '../shared/imageItem';

type GalleryConfig = { folder?: string };

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

function processor(withHash: boolean): ComponentProcessor<PartDescriptor> {
  return ({ component }) => {
    // `Component` is a union that includes fragments (no config): narrow by shape.
    const config = ((component as { config?: GalleryConfig } | undefined)?.config ?? {}) as GalleryConfig;
    return { items: shuffle(imagesUnder(config.folder)).map((image) => toImageItem(image, withHash)) };
  };
}

export const blurhashGalleryProcessor = processor(true);
export const simpleGalleryProcessor = processor(false);
