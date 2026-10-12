import type {Menu} from './menus';
import {canonicalStoreKey,identityAnchors,resolvedStoreKey,type StoreIdentityAnchor} from './store-identity.ts';
export {storeIdentity} from './store-identity.ts';

export type MenuStoreGroup={key:string;placeId:string;menus:Menu[];ownerRegistered:boolean;reportCount:number;reportCountIsMinimum:true};

// A registration, a public store ID, or a matching name alone is not an approved claim.
// verifiedOwner describes the menu author; ownerClaimVerified describes its store.
export function hasVerifiedOwner(menu:Menu):boolean{
 return !menu.isDemo&&(menu.verifiedOwner===true||menu.ownerClaimVerified===true);
}

/** One visual store group; the original reports and their IDs are never rewritten. */
export function menuStoreGroups(menus:readonly Menu[],extraAnchors:readonly StoreIdentityAnchor[]=[]):MenuStoreGroup[]{
 const unique=[...new Map(menus.map(menu=>[menu.id,menu])).values()];
 const anchors=identityAnchors([...extraAnchors,...unique.flatMap(menu=>{
  const key=menu.isDemo?null:canonicalStoreKey(menu.placeId,menu.ownerStoreId);
  return key?[{key,name:menu.shop,address:menu.area}]:[];
 })]);
 const stores=new Map<string,MenuStoreGroup>();
 for(const menu of unique){
  const canonical=canonicalStoreKey(menu.placeId,menu.ownerStoreId);
  const key=menu.isDemo?'demo:'+menu.id:resolvedStoreKey(menu.shop,menu.area,canonical,menu.placeId||menu.id,anchors);
  let store=stores.get(key);
  if(!store){store={key,placeId:key.startsWith('nowgo-')?key:menu.placeId||key,menus:[],ownerRegistered:false,reportCount:0,reportCountIsMinimum:true};stores.set(key,store)}
  store.menus.push(menu);
  store.ownerRegistered ||=hasVerifiedOwner(menu);
  if(Number.isSafeInteger(menu.reportCount)&&menu.reportCount!>=0)store.reportCount=Math.max(store.reportCount,menu.reportCount!);
 }
 for(const store of stores.values()){
  const totalsByScope=new Map<string,number>();
  for(const menu of store.menus){if(menu.reportCountScope&&Number.isSafeInteger(menu.reportCount)&&menu.reportCount!>=0)totalsByScope.set(menu.reportCountScope,Math.max(totalsByScope.get(menu.reportCountScope)||0,menu.reportCount!))}
  store.reportCount=Math.max(store.reportCount,[...totalsByScope.values()].reduce((sum,count)=>sum+count,0));
  // Server totals can exceed the filtered page; partial pages never lower them.
  store.reportCount=Math.max(store.reportCount,store.menus.filter(menu=>!menu.isDemo&&!menu.verifiedOwner).length);
  // Prefer verified owner menus for the pin, without discarding consumer reports.
  store.menus.sort((a,b)=>Number(b.verifiedOwner===true)-Number(a.verifiedOwner===true)||Number(hasVerifiedOwner(b))-Number(hasVerifiedOwner(a)));
 }
 return [...stores.values()];
}

export function storePinMenu(store:MenuStoreGroup,selectedId?:string):Menu{
 const menu=store.menus.find(item=>item.id===selectedId)||store.menus[0];
 return {...menu,ownerRegistered:store.ownerRegistered,ownerClaimVerified:store.ownerRegistered,reportCount:store.reportCount,reportCountIsMinimum:true};
}
