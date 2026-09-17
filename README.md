# app-blurhash

Demo site app for [`lib-blurhash`](../lib-blurhash) on Enonic XP 8. Shows a blur-up gallery
and hero next to plain variants of each, so the difference is visible on one page.

React4xp app: parts are rendered server-side and hydrated in the browser. The placeholder is
decoded on the server by `lib-blurhash` and inlined as a PNG data URI; the client only fades
the real image in once it has decoded.

## Parts

| Part | What it shows |
| --- | --- |
| `blurhash-gallery` | Images directly under a folder (default: the current folder, else the site), shuffled, each over its BlurHash placeholder with a border in the image's average colour |
| `simple-gallery` | Same images, lazy-loaded, no placeholder |
| `blurhash-hero` | Title and text left, image right, on the image's dominant colour; image loads over its placeholder |
| `simple-hero` | Same layout on black, no placeholder |

`RevealImage` keeps the real `<img>` at opacity 0 until `img.decode()` resolves, so neither
progressive paint nor a cached image's top-to-bottom paint ever shows over the placeholder.

## Layout

| Path | Purpose |
| --- | --- |
| `src/main/resources/main.ts` | Calls `init()` from `lib-blurhash`: registers the upload listener, starts the backfill |
| `src/main/resources/cms/cms.yaml` | Registers the `blurhash` mixin for `media:image` |
| `src/main/resources/cms/site.yaml` | Site descriptor; routes single-component requests to `cms/component.ts` |
| `src/main/resources/cms/pages/default/` | Page controller; renders the `App` entry via react4xp |
| `src/main/resources/cms/parts/*/` | Part descriptors (no controllers; processors live under `react4xp/`) |
| `src/main/resources/react4xp/` | Entry, component registry, data fetcher, gallery/hero components and processors |
| `src/main/resources/guillotine/guillotine.ts` | Re-exports the library's Guillotine extensions: `media_Image.blurhash` |

The `blurhash` mixin *definition* ships inside lib-blurhash; only its registration lives
here, because `cms/cms.yaml` is a single app-level file a library cannot contribute.

## Build & run

Needs a running XP 8.1 with Content Studio. GraalJS only (`scriptEngine = 'GraalJS'`).

```
cd ../lib-blurhash && ./gradlew publishToMavenLocal   # lib-blurhash -> ~/.m2
cd ../app-blurhash && XP_HOME=/path/to/xp/home ./gradlew deploy
```

`deploy` depends on `jar`, so the app is rebuilt and the library re-merged automatically.
Skip the first line when only app code changed. If a library change appears not to land,
Gradle resolved a cached SNAPSHOT; add `--refresh-dependencies`.

`./gradlew dev` runs a continuous rebuild-and-redeploy. It watches this app only, not the
library.

```
pnpm run check:types   # server .ts and react4xp .tsx
```

> **Server code must be `.ts`.** A hand-written `.js` under `src/main/resources` never
> reaches the jar: `pnpmPack` deletes `build/resources/main/**/*.js` before `vp pack`
> regenerates from `.ts`. The build still succeeds; the file is silently absent.

## Try it

1. Create a project, connect this app, add a folder with images.
2. Add a page with the default controller; drop a `blurhash-gallery` or `blurhash-hero` in the
   `main` region. The gallery defaults to the folder the page sits on.
3. Throttle the network in devtools and reload: placeholders appear immediately, images fade
   in as they decode.

Admin: http://localhost:8080/admin
