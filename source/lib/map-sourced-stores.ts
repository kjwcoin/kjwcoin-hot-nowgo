import {menuStoreGroups,type MenuStoreGroup} from './menu-store-groups.ts';
import {distanceKm,MAP_RADIUS_KM,type GeoPoint} from './nearby-demo.ts';
import type {Menu} from './menus';
import type {PublicSourcedStore} from './sourced-store';
export type SourceFilters={query:string;heat:number;flavor:string;category:string;budget?:number};
export function sourcedStoreMatches(store:PublicSourcedStore,filters:SourceFilters):boolean{
 if(filters.heat||filters.budget||(filters.flavor&&filters.flavor!=='전체')||(filters.category&&filters.category!=='전체'))return false;
 const query=filters.query.replace(/[^\p{L}\p{N}\s]/gu,'').trim().slice(0,60).toLocaleLowerCase('ko-KR');
 return !query||[store.name,store.address,...store.menus.map(menu=>menu.name)].some(text=>text.toLocaleLowerCase('ko-KR').includes(query));
}
export function sourcedStoresNearby(stores:readonly PublicSourcedStore[],origin:GeoPoint|null):PublicSourcedStore[]{
 // No guessed coordinates. Address-only stores remain available in the unlocated list.
 return stores.filter(store=>!origin||(store.coordinates&&distanceKm(origin,{lat:store.coordinates.lat,lng:store.coordinates.lon})<=MAP_RADIUS_KM));
}
export type MapStoreGroup={key:string;source?:PublicSourcedStore;catalog?:MenuStoreGroup};
export function mapStoreGroups(menus:readonly Menu[],sources:readonly PublicSourcedStore[],identitySources:readonly PublicSourcedStore[]=sources):MapStoreGroup[]{
 const anchors=identitySources.map(store=>({key:'nowgo-'+store.id,name:store.name,address:store.address}));
 const groups=new Map<string,MapStoreGroup>(menuStoreGroups(menus,anchors).map(catalog=>[catalog.key,{key:catalog.key,catalog}]));
 for(const source of sources){const key='nowgo-'+source.id;const group=groups.get(key)||{key};group.source=source;groups.set(key,group)}
 return [...groups.values()];
}
export function sourceIsPrimaryPin(group:MapStoreGroup):boolean{return !!group.source&&!group.catalog?.ownerClaimVerified}
