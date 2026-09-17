/**
 * Descriptor -> React view. Mirrors dataFetcher.ts; both are keyed by the same descriptors.
 * Runs in the browser too, so `app.name` is not available here: the app name is spelled out.
 */
import { ComponentRegistry } from '@enonic/react-components';
import { Gallery } from './components/gallery/Gallery';
import { Hero } from './components/hero/Hero';
import { DefaultPage } from './components/page/DefaultPage';

const APP = 'bre.app.blurhash';

export const componentRegistry = new ComponentRegistry();

componentRegistry.addPage(`${APP}:default`, { View: DefaultPage });
componentRegistry.addPart(`${APP}:blurhash-gallery`, { View: Gallery });
componentRegistry.addPart(`${APP}:simple-gallery`, { View: Gallery });
componentRegistry.addPart(`${APP}:blurhash-hero`, { View: Hero });
componentRegistry.addPart(`${APP}:simple-hero`, { View: Hero });
