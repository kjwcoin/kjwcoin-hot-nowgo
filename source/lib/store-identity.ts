/** Identity links do not imply ownership or claim verification. */
export type StoreIdentityAnchor={key:string;name:string;address:string};
export function storeIdentity(shop:string,address:string):string|null{
 const normalize=(value:string)=>value.normalize('NFKC').replace(/\s/gu,'').toLocaleLowerCase('ko-KR');
 const name=normalize(shop),location=normalize(address);
 return name&&location?JSON.stringify([name,location]):null;
}
export function canonicalStoreKey(placeId:string|null|undefined,ownerId:string|null|undefined):string|null{
 // Public canonical place IDs take precedence. A legacy provider ID is not canonical.
 if(typeof placeId==='string'&&/^nowgo-.+/.test(placeId))return placeId;
 return ownerId?'nowgo-'+ownerId:null;
}
export function identityAnchors(anchors:readonly StoreIdentityAnchor[]):Map<string,Set<string>>{
 const result=new Map<string,Set<string>>();
 for(const anchor of anchors){
  const identity=storeIdentity(anchor.name,anchor.address);if(!identity)continue;
  const keys=result.get(identity)||new Set<string>();keys.add(anchor.key);result.set(identity,keys);
 }
 return result;
}
export function resolvedStoreKey(name:string,address:string,canonical:string|null,fallback:string,anchors:Map<string,Set<string>>):string{
 if(canonical)return canonical;
 const identity=storeIdentity(name,address),keys=identity?anchors.get(identity):undefined;
 return keys?.size===1?[...keys][0]:identity?'reported:'+identity:'place:'+fallback;
}
