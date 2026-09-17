/**
 * Runs once when the application starts.
 *
 * The library does not register its listener on import — this is the single call site, and
 * `main.js` running exactly once per app start is what makes it once per application.
 */
import { init } from '/lib/blurhash';

init();
