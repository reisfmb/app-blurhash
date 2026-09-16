/**
 * Single page controller: every site request lands here (see site.yaml). The DataFetcher walks
 * the content's component tree and runs each registered processor; the `App` entry renders the
 * result, server-side, and hydrates it in the browser.
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
  if (data.component.type === 'page' && !data.component.descriptor) {
    return { status: 418 }; // no page template chosen yet: let Content Studio show its picker
  }

  const id = `react4xp_${content._id}`;
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${content.displayName}</title>
</head>
<body>
  <div id="${id}"></div>
</body>
</html>`;

  return render('App', data, request, { body, id });
}
