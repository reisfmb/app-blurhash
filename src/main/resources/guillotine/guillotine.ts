/**
 * Guillotine picks this file up from every installed app. The library cannot ship it (single
 * app-level path), so the app re-exports the library's extensions: `media_Image.blurhash`.
 */
import { guillotineExtensions } from '/lib/blurhash';

export const extensions = guillotineExtensions;
