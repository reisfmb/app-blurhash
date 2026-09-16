import type { ComponentProps, PageData } from '@enonic/react-components';
import { Regions } from '@enonic/react-components';

/** The `default` page: one region, `main`, rendered with the editor's drop-zone markup. */
export function DefaultPage({ component, common, meta }: ComponentProps<PageData>) {
  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
      <Regions component={component} common={common} meta={meta} />
    </main>
  );
}
