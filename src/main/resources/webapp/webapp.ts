/**
 * Dev harness for lib-blurhash. One section per milestone, each reporting independently so a
 * failure names the milestone that broke.
 *
 * http://localhost:8080/webapp/bre.app.blurhash/    (?id=<contentId>, ?repo=<repo>)
 */

import { query, get as getContent, getAttachmentStream, modify } from '/lib/xp/content';
import { run } from '/lib/xp/context';
import { decode, decodeRgb, encodeThumbnail, process } from '/lib/blurhash';
// Not public API (frozen at M6): reached by path because this harness is the library's own.
import { readThumbnail } from '/lib/blurhash/pixels';
import { config } from '/lib/blurhash/settings';
import { KEYS } from '/lib/blurhash/config';
import { get as getTask } from '/lib/xp/task';

const DEFAULT_REPO = 'com.enonic.cms.blurhash-demo';

/** The sampling size the plan settles on. */
const MAX_EDGE = 32;

type Request = { params: Record<string, string | undefined> };

type StoredMedia = {
  x?: Record<string, Record<string, { hash?: string; source?: string }>>;
};

type Media = {
  _id: string;
  _name: string;
  _path: string;
  data: { media?: { attachment?: string } };
  x?: Record<string, Record<string, { imageWidth?: number; imageHeight?: number }>>;
};

type ImageBean = {
  rgbaThumbnail: (source: unknown, maxEdge: number) => number[];
  pngBase64: (source: unknown, maxEdge: number) => string;
  pngBase64Rgba: (rgba: number[], width: number, height: number) => string;
};

function bean(): ImageBean {
  return __.newBean<ImageBean>('bre.lib.blurhash.ImageBean');
}

function esc(value: unknown): string {
  return String(value).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}

/** A webapp request carries no repo, branch or principal — content reads need all three. */
function inAdmin<T>(repo: string, fn: () => T): T {
  return run({ repository: repo, branch: 'draft', principals: ['role:system.admin'] }, fn);
}

function subject(repo: string, id?: string): Media {
  return inAdmin(repo, () => {
    if (id) {
      const byId = getContent({ key: id }) as Media | null;
      if (!byId) throw new Error(`no content ${id} in ${repo}`);
      return byId;
    }
    const hits = query({ count: 1, contentTypes: ['media:image'], sort: '_path ASC', query: '' });
    if (hits.total === 0) throw new Error(`no media:image in ${repo} — upload one, or pass ?repo=`);
    return hits.hits[0] as unknown as Media;
  });
}

/** PNG data URI from raw RGBA, so a decoded hash can be rendered without a round trip. */
function pngFromRgba(pixels: Uint8ClampedArray, width: number, height: number): string {
  return `data:image/png;base64,${bean().pngBase64Rgba(Array.from(pixels), width, height)}`;
}

function m2(req: Request): string {
  const repo = req.params.repo || DEFAULT_REPO;
  const image = subject(repo, req.params.id);
  const name = image.data.media?.attachment || image._name;

  return inAdmin(repo, () => {
    const b = bean();

    const pixelStart = Date.now();
    const raw = b.rgbaThumbnail(getAttachmentStream({ key: image._id, name }), MAX_EDGE);
    const pixelMs = Date.now() - pixelStart;

    const thumb = readThumbnail(raw);
    if (!thumb) return `FAILED: readThumbnail rejected ${raw.length} ints`;

    const encodeStart = Date.now();
    const hash = encodeThumbnail(raw);
    const encodeMs = Date.now() - encodeStart;
    if (!hash) return `FAILED: encodeThumbnail returned null for ${thumb.width}×${thumb.height}`;

    // Decode at the sampled size. Decode cost is linear in output pixels and the result is
    // blur either way, so a larger buffer buys nothing the browser will not do for free.
    const outW = thumb.width;
    const outH = thumb.height;

    const decodeStart = Date.now();
    const blur = decodeRgb(hash, outW, outH);
    const decodeMs = Date.now() - decodeStart;
    if (!blur) return `FAILED: decodeRgb returned null for ${hash}`;

    // Decode cost scales with output pixels x components, so measure a few sizes: this is
    // the number that decides whether M9's caching is worth anything.
    const scaling = [1, 2, 4, 8].map((factor) => {
      const w = thumb.width * factor;
      const h = thumb.height * factor;
      const started = Date.now();
      decodeRgb(hash, w, h);
      return `${w}x${h} (${w * h} px): ${Date.now() - started} ms`;
    }).join('\n  ');

    const original = `data:image/png;base64,${b.pngBase64(getAttachmentStream({ key: image._id, name }), 256)}`;

    return (
      `HTML:<figure style="display:inline-block;margin:0 2rem 0 0">` +
      `<img src="${original}" height="220"><figcaption>original</figcaption></figure>` +
      `<figure style="display:inline-block">` +
      `<img src="${pngFromRgba(blur, outW, outH)}" height="220">` +
      `<figcaption>from the hash</figcaption></figure>` +
      `\n\n${image._path}\n` +
      `decoded at: ${outW} × ${outH}\n` +
      `sampled: ${thumb.width} × ${thumb.height} (${thumb.pixels.length} bytes, stride ` +
      `${thumb.pixels.length / (thumb.width * thumb.height)})\n` +
      `hash: ${hash}\n` +
      `length: ${hash.length}\n` +
      `timing: pixels ${pixelMs} ms, encode ${encodeMs} ms, decode ${decodeMs} ms\n` +
      `decode by size:\n  ${scaling}`
    );
  });
}

/**
 * M3: store the hash, then render from what was stored.
 *
 * Deliberately calls `process` twice. The second call must report `unchanged` — that is the
 * fingerprint guard working, visible without opening Content Studio, and it is what makes
 * M4's listener safe to switch on.
 */
function m3(req: Request): string {
  const repo = req.params.repo || DEFAULT_REPO;
  const image = subject(repo, req.params.id);

  return inAdmin(repo, () => {
    const first = process(image._id);
    const second = process(image._id);

    const stored = (getContent({ key: image._id }) as StoredMedia | null)
      ?.x?.['bre-app-blurhash']?.blurhash;

    if (!stored || !stored.hash) {
      return `FAILED: nothing stored on ${image._path}\n` +
        `first:  ${JSON.stringify(first)}\nsecond: ${JSON.stringify(second)}`;
    }

    // An aspect ratio, not a size: the same image comes back for 4x3 and 1200x900.
    const placeholder = decode(stored.hash, { width: 4, height: 3 });
    const asDisplaySize = decode(stored.hash, { width: 1200, height: 900 });

    // Null is a legitimate outcome once M6 lets an editor break the field: render nothing.
    const figure = placeholder
      ? `<figure style="display:inline-block"><img src="${placeholder}" height="220">` +
        `<figcaption>from the stored hash</figcaption></figure>`
      : `<p><em>Stored hash is invalid — rendering without a placeholder (see M6).</em></p>`;

    return (
      `HTML:${figure}` +
      `\n\nfirst call:  ${JSON.stringify(first)}\n` +
      `second call: ${JSON.stringify(second)}   <- must be "unchanged"\n\n` +
      `stored hash:   ${stored.hash}\n` +
      `stored source: ${stored.source}\n` +
      `placeholder:   ${placeholder ? `${placeholder.length} chars of data URI` : 'null'}\n` +
      `4:3 and 1200:900 agree: ${placeholder === asDisplaySize}`
    );
  });
}

/**
 * M4: the listener refills a hash nobody asked it to.
 *
 * Two steps on purpose. `?clear=1` wipes the stored mixin, which itself fires node.updated —
 * so by the time the page is reloaded the listener should already have put a hash back. A
 * single request cannot show this: the event is asynchronous, and sleeping inside a
 * controller to wait for it would prove less than reloading does.
 */
function m4(req: Request): string {
  const repo = req.params.repo || DEFAULT_REPO;
  const image = subject(repo, req.params.id);
  const clearing = req.params.clear === '1';

  return inAdmin(repo, () => {
    if (clearing) {
      modify<StoredMedia>({
        key: image._id,
        requireValid: false,
        editor: (c) => {
          if (c.x?.['bre-app-blurhash']) delete c.x['bre-app-blurhash'].blurhash;
          return c;
        },
      });

      return `HTML:<p>Cleared the mixin on <code>${image._path}</code>.` +
        ` <a href="?">Reload</a> — the listener should have refilled it.</p>` +
        `\n\ncleared at ${new Date().toISOString()}`;
    }

    const stored = (getContent({ key: image._id }) as StoredMedia | null)
      ?.x?.['bre-app-blurhash']?.blurhash;

    const state = stored && stored.hash
      ? `present: ${stored.hash}\nsource:  ${stored.source}`
      : 'ABSENT — if this persists after a reload, the listener is not running';

    return `HTML:<p><a href="?clear=1">Clear the hash</a>, then reload: ` +
      `the listener should restore it unaided.</p>` +
      `\n\nstored hash is ${state}`;
  });
}

/**
 * M5: the backfill runs from install(), so the only honest test is to give it work and
 * restart the app.
 *
 * `?wipe=1` strips the mixin from every image in the repo. Redeploy, reload, and the count
 * should be back to full without anyone asking.
 */
function m5(req: Request): string {
  const repo = req.params.repo || DEFAULT_REPO;

  return inAdmin(repo, () => {
    const images = query({ count: 500, contentTypes: ['media:image'], sort: '_path ASC', query: '' });

    if (req.params.wipe === '1') {
      images.hits.forEach((hit) => {
        modify<StoredMedia>({
          key: hit._id,
          requireValid: false,
          editor: (c) => {
            if (c.x?.['bre-app-blurhash']) delete c.x['bre-app-blurhash'].blurhash;
            return c;
          },
        });
      });

      return `HTML:<p>Wiped the hash from ${images.total} image(s). ` +
        `Redeploy the app, then <a href="?">reload</a> — install() should refill them.</p>` +
        `\n\nwiped at ${new Date().toISOString()}`;
    }

    let hashed = 0;
    images.hits.forEach((hit) => {
      const stored = (hit as unknown as StoredMedia).x?.['bre-app-blurhash']?.blurhash;
      if (stored && stored.hash) hashed++;
    });

    const task = req.params.task ? JSON.stringify(getTask(req.params.task)) : null;

    return `HTML:<p><a href="?wipe=1">Wipe every hash</a>, redeploy, then reload.</p>` +
      `\n\n${hashed} of ${images.total} image(s) hashed` +
      (task ? `\n\ntask: ${task}` : '');
  });
}

/**
 * M6: config is read, and a broken hash degrades to "no placeholder" rather than to an error.
 *
 * The `hash` field is editable in Content Studio, so it is untrusted input. `?corrupt=1`
 * overwrites the stored hash with junk; the page must then render the M3 section with a null
 * placeholder and `process` must still say `unchanged` — the fingerprint matches, so the
 * library will not repair it unaided. `?repair=1` clears the mixin and lets the listener
 * refill it, which is also the documented remedy.
 */
function m6(req: Request): string {
  const repo = req.params.repo || DEFAULT_REPO;

  const effective = JSON.stringify(config());
  // By key, not Object.keys: app.config is a Java map behind a host object and does not
  // enumerate. Index access is the only thing that works on it.
  const raw = JSON.stringify(
    Object.keys(KEYS).reduce((acc, name) => {
      const key = KEYS[name as keyof typeof KEYS];
      const value = app.config[key];
      return value === undefined ? acc : { ...acc, [key]: value };
    }, {} as Record<string, string>),
  );

  const junk = [
    ['not a hash', 'not a hash'],
    ['illegal chars, right length', 'L' + '/'.repeat(27)],
    ['claims 9x9, 28 chars', '|' + 'L'.repeat(27)],
    ['empty', ''],
  ] as const;
  const rejected = junk.map(([label, value]) => `${label}: ${decode(value) === null ? 'null' : 'NOT NULL'}`);
  if (rejected.some((line) => line.indexOf('NOT NULL') !== -1)) {
    return `FAILED: decode accepted junk\n${rejected.join('\n')}`;
  }

  const image = subject(repo, req.params.id);
  return inAdmin(repo, () => {
    const namespace = app.name.replace(/\./g, '-');

    if (req.params.corrupt === '1') {
      modify<StoredMedia>({
        key: image._id,
        requireValid: false,
        editor: (c) => {
          const x = (c.x || {}) as Record<string, Record<string, unknown>>;
          x[namespace] = x[namespace] || {};
          x[namespace].blurhash = { ...(x[namespace].blurhash as object), hash: 'L' + '/'.repeat(27) };
          c.x = x as typeof c.x;
          return c;
        },
      });
      return `HTML:<p>Corrupted the stored hash on <code>${image._path}</code>. ` +
        `<a href="?">Reload</a>: M3 must render nothing rather than fail, and report <code>unchanged</code>. ` +
        `<a href="?repair=1">Repair</a> when done.</p>\n\ncorrupted at ${new Date().toISOString()}`;
    }

    if (req.params.repair === '1') {
      modify<StoredMedia>({
        key: image._id,
        requireValid: false,
        editor: (c) => {
          if (c.x?.[namespace]) delete c.x[namespace].blurhash;
          return c;
        },
      });
      return `HTML:<p>Cleared the mixin on <code>${image._path}</code>; the listener refills it. ` +
        `<a href="?">Reload</a>.</p>\n\nrepaired at ${new Date().toISOString()}`;
    }

    const stored = (getContent({ key: image._id }) as StoredMedia | null)?.x?.[namespace]?.blurhash;
    const placeholder = stored?.hash ? decode(stored.hash) : null;

    return `HTML:<p><a href="?corrupt=1">Corrupt the stored hash</a> on the subject image, reload, ` +
      `then <a href="?repair=1">repair</a>.</p>` +
      `\n\neffective config: ${effective}\n` +
      `from app.config:  ${raw}\n\n` +
      `decode rejects junk:\n  ${rejected.join('\n  ')}\n\n` +
      `stored hash: ${stored?.hash ?? '(none)'}\n` +
      `decodes to:  ${placeholder ? `${placeholder.length} chars of data URI` : 'null — renders without a placeholder'}`;
  });
}

function section(title: string, run_: () => string): string {
  let ok = true;
  let body: string;
  try {
    body = run_();
  } catch (e) {
    ok = false;
    const err = e as Error;
    body = `${err.name || 'Error'}: ${err.message}\n\n${err.stack || ''}`;
  }

  const rendered = body.indexOf('HTML:') === 0
    ? (() => {
        const split = body.indexOf('\n\n');
        return body.substring(5, split === -1 ? undefined : split) +
          (split === -1 ? '' : `<pre>${esc(body.substring(split).trim())}</pre>`);
      })()
    : `<pre>${esc(body)}</pre>`;

  return `<section class="${ok ? 'ok' : 'fail'}"><h2>${esc(title)} ` +
    `<span>${ok ? 'PASS' : 'FAIL'}</span></h2>${rendered}</section>`;
}

/** `?dump=/site/some-folder`: the stored page state of one content, as CS sees it. */
function dump(req: Request): { contentType: string; body: string } | null {
  const key = req.params.dump;
  const repo = req.params.repo || DEFAULT_REPO;
  if (req.params.tree === '1') {
    const rows = inAdmin(repo, () => query({ count: 200, query: '', sort: '_path ASC' }).hits as unknown as Record<string, unknown>[])
      .map((c) => ({ _path: c._path, type: c.type, displayName: c.displayName, valid: c.valid, page: c.page }));
    return { contentType: 'application/json', body: JSON.stringify(rows, null, 1) };
  }
  if (!key) return null;
  const content = inAdmin(repo, () => getContent({ key }) as Record<string, unknown> | null);
  const picked = content
    ? { _path: content._path, type: content.type, displayName: content.displayName, valid: content.valid, data: content.data, page: content.page }
    : { error: `no content ${key} in ${repo}` };
  return { contentType: 'application/json', body: JSON.stringify(picked, null, 2) };
}

function handleGet(req: Request): { contentType: string; body: string } {
  const dumped = dump(req);
  if (dumped) return dumped;

  const sections = [
    section('M2 — encode and decode', () => m2(req)),
    section('M3 — store in the mixin, render from storage', () => m3(req)),
    section('M4 — event listener refills it', () => m4(req)),
    section('M5 — backfill on install', () => m5(req)),
    section('M6 — config and untrusted hashes', () => m6(req)),
  ].join('\n');

  return {
    contentType: 'text/html; charset=utf-8',
    body: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>lib-blurhash harness</title><style>
      body{font:14px/1.5 ui-monospace,monospace;margin:2rem;max-width:70rem}
      section{border-left:4px solid #ccc;padding:0 1rem;margin:1rem 0}
      .ok{border-color:#2a2} .fail{border-color:#c22}
      h2 span{font-size:.7em;padding:.1em .5em;border-radius:3px;color:#fff;vertical-align:middle}
      .ok h2 span{background:#2a2} .fail h2 span{background:#c22}
      pre{white-space:pre-wrap;background:#f6f6f6;padding:.75rem;overflow-x:auto}
      figure{margin:0;text-align:center} img{border:1px solid #ddd;background:#fff}
    </style></head><body><h1>lib-blurhash harness</h1>${sections}</body></html>`,
  };
}

export { handleGet as GET };
