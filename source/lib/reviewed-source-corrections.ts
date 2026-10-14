import correctedRows from '../data/hot-source-corrections24-records.json' with {type:'json'};
import correctedStores from '../data/hot-source-corrections24-registry.json' with {type:'json'};
/** Reviewed replacements only: never append identities or mutate historical input files.
 * The existing regional parser still validates every projected field and disclosure.
 */
function hasIdentity(value:unknown):value is {id:string;source_ref?:unknown;sourceRef?:unknown}{
 return value!==null&&typeof value==='object'&&'id' in value&&typeof value.id==='string';
}
export function applyReviewedCorrections<T extends {id:string}>(rows:readonly T[],corrections:readonly T[]):T[]{
 const replacements=new Map<string,T>(),duplicateIds=new Set<string>();
 for(const correction of corrections){
  if(!hasIdentity(correction))continue;
  if(replacements.has(correction.id)){duplicateIds.add(correction.id);continue;}
  replacements.set(correction.id,correction);
 }
 return rows.map(row=>{
  if(!hasIdentity(row)||duplicateIds.has(row.id))return row;
  const replacement=replacements.get(row.id);
  if(!hasIdentity(replacement))return row;
  const oldRef=row.source_ref??row.sourceRef,newRef=replacement.source_ref??replacement.sourceRef;
  return oldRef===newRef?replacement:row;
 });
}
export {correctedRows,correctedStores};
export function correctedRegionalFactUrl(sourceRef:string):string|undefined{
 return correctedStores.find(store=>store.sourceRef===sourceRef)?.source.url;
}
