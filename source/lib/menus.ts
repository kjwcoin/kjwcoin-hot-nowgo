export const HEAT=['순한맛','살짝 매운맛','매콤한맛','확실히 매운맛','아주 매운맛','불같이 매운맛','극한 매운맛'];
export const FLAVORS=['전체','얼큰한','칼칼한','달콤매콤한','알싸한'];
export type Menu={id:string,placeId:string,name:string,shop:string,price:number,heat:number,flavor:string,category:string,image:string,lat:number|null,lng:number|null,area:string,description:string,isDemo:boolean,soldout?:boolean,rating?:number,reviewCount?:number,reportCount?:number,reportedAt?:string,verifiedOwner?:boolean,ownerRegistered?:boolean,ownerStoreId?:string|null,nowgoSlug?:string|null};
export const MENU_CATEGORIES=['분식','국물·면','고기·볶음','닭발','족발','해산물','기타'];
export const RICH_HEAT=['담백','고소','크리미','버터·치즈 진하게','묵직하게 진한 맛'];
export const RICH_FLAVORS=['전체','고소한','크리미한','버터 풍미','치즈 풍미','기름진'];
export const RICH_MENU_CATEGORIES=['파스타','치즈·그라탱','베이커리','디저트','고기·튀김','기타'];
export const MENUS:Menu[]=[];
export const RICH_MENUS:Menu[]=[];
export const money=(n:number)=>n.toLocaleString('ko-KR')+'원';
export type Report={id:string;menu:string;status:string;created_at:string};

// SWEET theme data is kept in this shared catalog so all taste domains use one deployment source.
export const SWEET_HEAT=['은은한 단맛','가벼운 단맛','기분 좋은 단맛','진한 단맛','아주 진한 단맛'];
export const SWEET_FLAVORS=['전체','크리미한','버터리한','프루티한','초콜릿한','고소한'];
export const SWEET_MENU_CATEGORIES=['카페','베이커리','케이크','도넛·쿠키','아이스크림·빙수','초콜릿·캔디','전통 디저트','기타'];
export const SWEET_MENUS:Menu[]=[];
