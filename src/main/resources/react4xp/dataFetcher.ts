/**
 * One DataFetcher per app. Maps descriptors to processors; a processor's return value becomes
 * the React component's `data` prop. Pages and parts without a processor still render, with no
 * data.
 */
import { DataFetcher } from '/lib/enonic/react4xp';
import { blurhashGalleryProcessor, simpleGalleryProcessor } from './components/gallery/galleryProcessor';
import { blurhashHeroProcessor, simpleHeroProcessor } from './components/hero/heroProcessor';

export const dataFetcher = new DataFetcher();

dataFetcher.addPart(`${app.name}:blurhash-gallery`, { processor: blurhashGalleryProcessor });
dataFetcher.addPart(`${app.name}:simple-gallery`, { processor: simpleGalleryProcessor });
dataFetcher.addPart(`${app.name}:blurhash-hero`, { processor: blurhashHeroProcessor });
dataFetcher.addPart(`${app.name}:simple-hero`, { processor: simpleHeroProcessor });
