/**
 * One DataFetcher per app. Maps descriptors to processors; a processor's return value becomes
 * the React component's `data` prop. Pages and parts without a processor still render, with no
 * data.
 */
import { DataFetcher } from '/lib/enonic/react4xp';
import { blurhashGalleryProcessor, simpleGalleryProcessor } from './components/gallery/galleryProcessor';

export const dataFetcher = new DataFetcher();

dataFetcher.addPart(`${app.name}:blurhash-gallery`, { processor: blurhashGalleryProcessor });
dataFetcher.addPart(`${app.name}:simple-gallery`, { processor: simpleGalleryProcessor });
