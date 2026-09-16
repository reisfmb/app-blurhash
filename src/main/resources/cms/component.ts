/**
 * Component service: Content Studio's visual editor fetches one component at a time through
 * `/_/component/<region>/<index>...`. Resolve that path inside the page and render just it.
 */
import type { Component, Request, Response } from '@enonic-types/core';
import { render } from '/lib/enonic/react4xp';
import { getContent } from '/lib/xp/portal';
import { dataFetcher } from '/react4xp/dataFetcher';

function json(status: number, error: string): Response {
  return { status, contentType: 'application/json', body: JSON.stringify({ error }) };
}

/** `main/0/left/1` -> `main.components.0.regions.left.components.1` */
function componentAt(regions: Record<string, unknown>, requestPath: string): Component | undefined {
  const keys = requestPath
    .replace(/^.*\/_\/component\/(.+)$/, '$1')
    .replace(/\//, '.components.')
    .replace(/\//, '.regions.')
    .replace(/\//, '.components.')
    .split('.');
  let node: unknown = regions;
  for (const key of keys) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node as Component | undefined;
}

export function get(request: Request): Response {
  if (request.branch !== 'draft') return json(400, 'component service is draft-only');
  if (request.mode === 'live') return json(400, 'component service is not available in live mode');

  const content = getContent();
  if (!content) return json(404, 'no content');

  const regions = (content.page as { regions?: Record<string, unknown> } | undefined)?.regions || {};
  const component = componentAt(regions, request.path);
  if (!component) return json(404, `no component at ${request.path}`);

  const data = dataFetcher.process({ component, content, request });
  const id = `react4xp_${content._id}`;
  return render('App', data, request, { body: `<div id="${id}"></div>`, id });
}
