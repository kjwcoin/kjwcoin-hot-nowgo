import MapExplorer from '@/components/map-explorer';
import type {PublicSourcedStore} from '@/lib/sourced-store';

/** Direct links open the very same in-map detail as a list row or gray pin. */
export default function SourcedStoreMinihome({store,preview=false}:{store:PublicSourcedStore;preview?:boolean}){
 return <MapExplorer key={store.id} variant="hot" initialSourceStore={store} previewStore={preview?store:undefined}/>;
}
