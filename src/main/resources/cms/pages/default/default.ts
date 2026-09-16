import { getContent } from '/lib/xp/portal';
import { render } from '/lib/thymeleaf';

const view = resolve('default.html');

function handleGet(): { contentType: string; body: string } {
  const content = getContent<{ page?: { regions?: Record<string, unknown> } }>();
  const regions = content && content.page ? content.page.regions : undefined;

  return {
    contentType: 'text/html; charset=utf-8',
    // Regions do not fill themselves: the view emits one COMPONENT instruction per
    // component, and the portal post-processor renders each in place.
    body: render(view, { mainRegion: regions ? regions.main : { components: [] } }),
  };
}

export { handleGet as GET };
