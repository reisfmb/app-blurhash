/**
 * Server side of the two hero parts: the configured image, title and text. The blurhash variant
 * carries the placeholder and the dominant colour; the simple one has neither, so the view
 * falls back to black.
 */
import type { PartDescriptor } from '@enonic-types/core';
import type { ComponentProcessor } from '@enonic-types/lib-react4xp/DataFetcher';
import { imageItemById } from '../shared/imageItem';

type HeroConfig = { image?: string; title?: string; text?: string };

function processor(withHash: boolean): ComponentProcessor<PartDescriptor> {
  return ({ component }) => {
    const config = ((component as { config?: HeroConfig } | undefined)?.config ?? {}) as HeroConfig;
    return {
      title: config.title || '',
      text: config.text || '',
      image: imageItemById(config.image, withHash),
    };
  };
}

export const blurhashHeroProcessor = processor(true);
export const simpleHeroProcessor = processor(false);
