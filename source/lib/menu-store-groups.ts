import type {Menu} from './menus';
export function menuStoreGroups(menus:readonly Menu[]){
 const stores=new Map<string,{placeId:string;menus:Menu[];ownerRegistered:boolean;reportCount:number}>(),seen=new Set<string>();
 for(const menu of menus){
  if(seen.has(menu.id))continue;
  seen.add(menu.id);
  const groupKey=menu.ownerStoreId?'nowgo-'+menu.ownerStoreId:menu.placeId.startsWith('reported-')?'reported:'+menu.shop.trim().toLocaleLowerCase()+':'+menu.area.replace(/\s/g,'').toLocaleLowerCase():menu.placeId||menu.id;
  const placeId=menu.placeId||menu.id;
  const store=stores.get(groupKey);
  if(store){if(menu.ownerRegistered&&!store.menus[0].ownerRegistered)store.menus.unshift(menu);else store.menus.push(menu);store.reportCount=Math.max(store.reportCount,menu.reportCount??store.menus.filter(m=>!m.verifiedOwner).length);store.ownerRegistered ||=menu.ownerRegistered===true;}
  else stores.set(groupKey,{placeId,menus:[menu],reportCount:menu.reportCount??(menu.verifiedOwner?0:1),ownerRegistered:menu.ownerRegistered===true});
 }
 return [...stores.values()];
}
