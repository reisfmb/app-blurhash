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

```
cd ../lib-blurhash && ./gradlew publishToMavenLocal   # lib-blurhash -> ~/.m2
cd ../app-blurhash && ./gradlew build
cp build/libs/app-blurhash.jar ~/.enonic/sandboxes/blurhash/home/deploy/
```

Sandbox `blurhash` (XP 8.1.0-RC2, Essentials template — includes Content Studio):

```
enonic sandbox start blurhash --detach
```

Admin: http://localhost:8080/admin
