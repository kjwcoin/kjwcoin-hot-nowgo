import type {Menu} from './menus';
export function menuStoreGroups(menus:readonly Menu[]){
 const stores=new Map<string,{placeId:string;menus:Menu[];ownerRegistered:boolean}>(),seen=new Set<string>();
 for(const menu of menus){
  if(seen.has(menu.id))continue;
  seen.add(menu.id);
  const placeId=menu.placeId||menu.id;
  const store=stores.get(placeId);
  if(store){store.menus.push(menu);store.ownerRegistered ||=menu.ownerRegistered===true;}
  else stores.set(placeId,{placeId,menus:[menu],ownerRegistered:menu.ownerRegistered===true});
 }
 return [...stores.values()];
}
