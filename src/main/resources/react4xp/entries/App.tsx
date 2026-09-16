/**
 * The only React4XP entry. Receives the DataFetcher result for the whole page (or, from the
 * component service, for one component) and lets BaseComponent walk the tree through the
 * registry.
 */
import '@enonic/react-components/utils/initPublicPath';
import type { MetaData } from '@enonic/react-components';
import { BaseComponent } from '@enonic/react-components';
import type { AppProps } from '/types/AppProps';
import { componentRegistry } from '../componentRegistry';

export default function App({ component, data, common, meta }: AppProps) {
  const compMeta: MetaData = { ...(meta as MetaData), componentRegistry };
  return <BaseComponent component={component} data={data} common={common} meta={compMeta} />;
}

App.displayName = 'App';
