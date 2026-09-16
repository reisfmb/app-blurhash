/**
 * The `default` page controller. XP calls it once a content has this page set; until then XP's
 * own page handler answers, which is what Content Studio expects for "no page yet" (its
 * controller picker). The DataFetcher walks the page's component tree and runs each registered
 * processor; the `App` entry renders the result server-side and hydrates it in the browser.
 */
import type { Request, Response } from '@enonic-types/core';
import { render } from '/lib/enonic/react4xp';
import { getContent } from '/lib/xp/portal';
import { dataFetcher } from '/react4xp/dataFetcher';

export function get(request: Request): Response {
  const content = getContent();
  if (!content) {
    return { status: 404, contentType: 'text/html', body: '<h1>Page not found</h1>' };
  }

  const data = dataFetcher.process({ content, request });
  const id = `react4xp_${content._id}`;
  // Content Studio 6 unlocks a page only when <body> itself is the page component
  // (editor.js: `isComponentElement(document.body)`), so the marker goes on the body tag and
  // App.tsx renders the page without an inner wrapper carrying the same attribute.
  const bodyAttrs = request.mode === 'edit' ? ' data-portal-component-type="page"' : '';
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${content.displayName}</title>
</head>
<body${bodyAttrs}>
  <div id="${id}"></div>
</body>
</html>`;

  return render('App', data, request, { body, id });
}
