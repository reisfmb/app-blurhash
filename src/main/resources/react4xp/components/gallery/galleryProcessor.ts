/**
 * Server side of the two gallery parts: list the images directly under the site and shape them
 * for <Gallery>. The blurhash variant adds a decoded placeholder; the simple one does not.
 */
import type { PartDescriptor } from '@enonic-types/core';
import type { ComponentProcessor } from '@enonic-types/lib-react4xp/DataFetcher';
import { getChildren } from '/lib/xp/content';
import { getSite, imageUrl } from '/lib/xp/portal';
import { decode } from '/lib/blurhash';
import type { GalleryItem } from './GalleryItem';

type Image = {
  _id: string;
  displayName: string;
  type: string;
  x?: Record<string, Record<string, unknown>>;
};

/** `x` namespace the lib writes to: the consuming app's name with dots replaced by dashes. */
const NAMESPACE = app.name.replace(/\./g, '-');

function imagesUnderSite(): Image[] {
  const site = getSite();
  if (!site) return [];
  return (getChildren({ key: site._id, count: 100 }).hits as unknown as Image[])
    .filter((c) => c.type === 'media:image');
}

function toItem(image: Image, withPlaceholder: boolean): GalleryItem {
  const info = (image.x?.media?.imageInfo ?? {}) as { imageWidth?: number; imageHeight?: number };
  const width = info.imageWidth || 4;
  const height = info.imageHeight || 3;
  const stored = image.x?.[NAMESPACE]?.blurhash as { hash?: string } | undefined;

  return {
    url: imageUrl({ id: image._id, scale: 'full' }),
    alt: image.displayName,
    width,
    height,
    // Null when there is no hash yet, or the stored one is invalid: the <img> still renders.
    placeholder: withPlaceholder && stored?.hash ? decode(stored.hash, { width, height }) : null,
  };
}

export const blurhashGalleryProcessor: ComponentProcessor<PartDescriptor> = () => ({
  items: imagesUnderSite().map((image) => toItem(image, true)),
});

export const simpleGalleryProcessor: ComponentProcessor<PartDescriptor> = () => ({
  items: imagesUnderSite().map((image) => toItem(image, false)),
});
