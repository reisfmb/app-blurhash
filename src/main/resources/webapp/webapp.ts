/**
 * Dev harness for lib-blurhash. One section per milestone, each reporting independently so a
 * failure names the milestone that broke.
 *
 * http://localhost:8080/webapp/bre.app.blurhash/    (?id=<contentId>, ?repo=<repo>)
 */

import { query, get as getContent, getAttachmentStream } from '/lib/xp/content';
import { run } from '/lib/xp/context';
import { decodeRgb, encodeThumbnail, readThumbnail } from '/lib/blurhash';

const DEFAULT_REPO = 'com.enonic.cms.blurhash-demo';

/** The sampling size the plan settles on. */
const MAX_EDGE = 32;

type Request = { params: Record<string, string | undefined> };

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

function handleGet(req: Request): { contentType: string; body: string } {
  const sections = [section('M2 — encode and decode', () => m2(req))].join('\n');

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
