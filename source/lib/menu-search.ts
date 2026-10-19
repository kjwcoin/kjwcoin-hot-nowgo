/** Shared discovery-only query contract. It never changes a store's identity or
 * infers menu, price, heat, ownership, or availability facts. */
export const MENU_SEARCH_MAX_CHARACTERS=60;
export const MENU_SEARCH_MAX_TERMS=8;
export function normalizedMenuQuery(query:string):string{
 return query.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}\s]/gu,'').trim().replace(/\s+/gu,' ');
}
export function menuSearchTerms(query:string):string[]{
 const normalized=normalizedMenuQuery(query);
 return normalized?[...new Set(normalized.split(' '))]:[];
}
export function menuSearchError(query:string):string|null{
 if(Array.from(normalizedMenuQuery(query)).length>MENU_SEARCH_MAX_CHARACTERS)return '검색어는 60자 이하로 입력해 주세요.';
 if(menuSearchTerms(query).length>MENU_SEARCH_MAX_TERMS)return '검색어는 8개 단어 이하로 입력해 주세요.';
 return null;
}
export function matchesMenuSearch(fields:readonly string[],query:string):boolean{
 if(menuSearchError(query))return false;
 const terms=menuSearchTerms(query);
 // Query normalization is shared with the server. Stored fields retain their
 // literal letters/numbers; spacing and punctuation never split a match.
 const normalizedFields=fields.map(value=>value.toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]/gu,''));
 return terms.every(term=>normalizedFields.some(value=>value.includes(term)));
}
/** Safe PostgREST grammar: AND between bounded terms, OR between fixed columns.
 * User regex/filter syntax is removed before interpolation. The only wildcard
 * is a fixed non-alphanumeric gap, not arbitrary intervening letters/numbers.
 * imatch (~*) is supported by PostgREST 10+; no schema or access change is needed.
 */
export function catalogMenuSearchFilter(query:string):string|null{
 const error=menuSearchError(query);if(error)throw new Error(error);
 const terms=menuSearchTerms(query);if(!terms.length)return null;
 const clauses=terms.map(term=>{
  const pattern=Array.from(term).join('[^[:alnum:]]*');
  return ['menu','shop','address'].map(column=>`${column}.imatch.${pattern}`).join(',');
 });
 return clauses.length===1?clauses[0]:`and(${clauses.map(clause=>`or(${clause})`).join(',')})`;
}
