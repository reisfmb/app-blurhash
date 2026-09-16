# app-blurhash

Demo site app for [`lib-blurhash`](../lib-blurhash) on Enonic XP 8.

Vanilla XP 8 app: Thymeleaf views, server-side only (no client bundle) — the blur
placeholder is decoded on the server and inlined into the markup.

## Layout

| Path | Purpose |
| --- | --- |
| `src/main/resources/cms/cms.yaml` | App-level CMS descriptor; registers the `blurhash` mixin |
| `src/main/resources/cms/site.yaml` | Site descriptor |
| `src/main/resources/cms/pages/default/` | Default page controller + Thymeleaf view |
| `src/main/java/` | (empty) app-side Java, if ever needed |

The `blurhash` mixin *definition* ships inside lib-blurhash; only its registration
lives here, because `cms/cms.yaml` is a single app-level file that a library cannot
contribute without colliding.

## Build & run

Needs a running XP 8.1 with Content Studio.

```
cd ../lib-blurhash && ./gradlew publishToMavenLocal   # lib-blurhash -> ~/.m2
cd ../app-blurhash && XP_HOME=/path/to/xp/home ./gradlew deploy
```

`deploy` depends on `jar`, so the app is rebuilt — and the library re-merged — automatically.
Skip the first line when only app code changed. If a library change appears not to land,
Gradle resolved a cached SNAPSHOT; add `--refresh-dependencies`.

`./gradlew dev` runs a continuous rebuild-and-redeploy. It watches this app only, not the
library.

> **Server code must be `.ts`.** A hand-written `.js` under `src/main/resources` never
> reaches the jar — `pnpmPack` deletes `build/resources/main/**/*.js` before `vp pack`
> regenerates from `.ts`. The build still succeeds; the file is silently absent.

Admin: http://localhost:8080/admin
