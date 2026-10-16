/** Eligibility screen for independently licensed menu evidence.
 * This pure decision cannot verify a real contract or owner claim.
 * Import endpoints MUST check a trusted server-side rights grant before writing.
 * NAVER Search responses are categorically excluded from permanent catalog imports.
 */
export type PlaceMenuEvidence={
 placeUrl:string;
 menuName:string;
 menuDescription?:string;
 pepperIndicatorVerified?:boolean;
 pepperIndicatorContext?:'spice_level'|'decorative'|'unknown';
 provenance:'independent_owner'|'independently_licensed'|'naver_search';
 permissionReference?:string;
 permissionScope?:{persistFacts:boolean;publicDisplay:boolean;commercialUse:boolean};
 countryCode:string;
 checkedAt:string;
};
export type PlaceMenuDecision={eligible:boolean;reason:'eligible_text'|'eligible_pepper'|'prohibited_api_import'|'missing_permission'|'invalid_source'|'invalid_evidence'|'outside_korea'|'no_spicy_menu_evidence'};
export function classifyNaverSpicyMenu(e:PlaceMenuEvidence,now=Date.now()):PlaceMenuDecision{
 if(e.provenance==='naver_search')return {eligible:false,reason:'prohibited_api_import'};
 if(!['independent_owner','independently_licensed'].includes(e.provenance)||!e.permissionReference?.trim()||!e.permissionScope?.persistFacts||!e.permissionScope.publicDisplay||!e.permissionScope.commercialUse)return {eligible:false,reason:'missing_permission'};
 try{const source=new URL(e.placeUrl);if(source.protocol!=='https:'||source.username||source.password||source.port||!['place.naver.com','m.place.naver.com','map.naver.com','m.map.naver.com'].includes(source.hostname))return {eligible:false,reason:'invalid_source'}}catch{return {eligible:false,reason:'invalid_source'}}
 if(e.countryCode!=='KR')return {eligible:false,reason:'outside_korea'};
 const checked=Date.parse(e.checkedAt);
 if(!e.menuName?.trim()||!Number.isFinite(checked)||checked>now)return {eligible:false,reason:'invalid_evidence'};
 const menuText=[e.menuName,e.menuDescription||''].join(' ');
 if(menuText.includes('매운맛'))return {eligible:true,reason:'eligible_text'};
 if(e.pepperIndicatorVerified===true&&e.pepperIndicatorContext==='spice_level')return {eligible:true,reason:'eligible_pepper'};
 return {eligible:false,reason:'no_spicy_menu_evidence'};
}
