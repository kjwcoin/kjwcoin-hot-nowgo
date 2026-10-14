import type {PublicSourcedStore} from './sourced-store';
/** Discovery text for two individually reviewed stores only. These are not owner
 * trade names, administrative addresses, merge keys, or source identity bindings.
 * Evidence stays in the server-only requested-two record's independent review.
 */
type SearchAliases={sourceRef:string;identity:readonly string[];menus:readonly {id:string;name:string;aliases:readonly string[]}[]};
const aliases:Readonly<Record<string,SearchAliases>>={
 '65a5768f-5c9e-563e-a04f-cbb81835ec02':{
  sourceRef:'data-go-kr-15083033-MA010120220812168532',
  // Exact branch/address corroboration: https://view.mk.co.kr/trip-food/article/260550/
  identity:['신대방 온정돈까스','온정돈까스 본점'],
  menus:[{id:'data-go-kr-15083033-MA010120220812168532:menu:1',name:'디진다 돈가스',aliases:['디진다 돈까스','디진다돈까스']}],
 },
 '75260ccd-ec8e-5f2d-961d-766cd4979d32':{
  sourceRef:'data-go-kr-15083033-MA010120220800449731',
  // Verified native/secondary names plus the user's bounded discovery shorthand.
  identity:['신길동별난아찌짬뽕','신길동 별난아찌 짬뽕','신길동 짬뽕'],
  menus:[],
 },
};
// Existing reviewed Sejong Business Center records spell the same building two ways.
// Exact identity AND full-address gates prevent this discovery aid from spreading
// to an unrelated building or surviving a future move. Source facts stay literal.
const sejongBusinessCenter:Readonly<Record<string,{sourceRef:string;address:string}>>={
 '26372641-4d71-5915-b9a3-ee16f61bdaac':{sourceRef:'jusoga-building-3611011000106570000000001-1e43720c',address:'세종특별자치시 가름로 232 세종비지니스센터 A동 138, 139호'},
 '6dfb917e-c38b-5ab3-b2fa-1a0d692bd1f6':{sourceRef:'archive-sejong-6d1f210cd98d51480e97',address:'세종특별자치시 가름로 232 세종비즈니스센터 B동 1층 116호'},
 '222861d7-45b8-5ff7-a475-f26394ee497a':{sourceRef:'jusoga-building-3611011000106570000000001-6b0cc1b1',address:'세종특별자치시 가름로 232 세종비지니스센터 A동 207호'},
};
export function sourcedStoreSearchAliases(store:PublicSourcedStore):readonly string[]{
 const building=sejongBusinessCenter[store.id];
 if(building&&building.sourceRef===store.sourceRef&&building.address===store.address)return ['세종비즈니스센터','세종비지니스센터'];
 const reviewed=aliases[store.id];
 if(!reviewed||reviewed.sourceRef!==store.sourceRef)return [];
 // A withdrawn or changed menu must also lose its menu-spelling search aliases.
 return [...reviewed.identity,...reviewed.menus.filter(expected=>store.menus.some(menu=>menu.id===expected.id&&menu.name===expected.name)).flatMap(menu=>menu.aliases)];
}
