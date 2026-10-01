export const HEAT=['순한맛','약간 매운맛','보통 매운맛','매운맛','아주 매운맛'];
export const FLAVORS=['전체','얼큰한','칼칼한','달콤매콤한','알싸한'];
export type Menu={id:string,placeId:string,name:string,shop:string,price:number,heat:number,flavor:string,category:string,image:string,lat:number|null,lng:number|null,area:string,description:string,isDemo:boolean,rating?:number,reviewCount?:number,reportedAt?:string,verifiedOwner?:boolean,ownerRegistered?:boolean,ownerStoreId?:string|null,nowgoSlug?:string|null};
export const MENU_CATEGORIES=['분식','국물·면','고기·볶음','닭발','족발','해산물','기타'];
export const RICH_HEAT=['담백','고소','크리미','버터·치즈 진하게','묵직하게 진한 맛'];
export const RICH_FLAVORS=['전체','고소한','크리미한','버터 풍미','치즈 풍미','기름진'];
export const RICH_MENU_CATEGORIES=['파스타','치즈·그라탱','베이커리','디저트','고기·튀김','기타'];
export const MENUS:Menu[]=[
{isDemo:true,id:'demo-menu-01',placeId:'demo-place-01',name:'달콤매콤 떡볶이',shop:'청라 분식집 · 가매장',price:6500,heat:3,flavor:'달콤매콤한',category:'분식',image:'/images/tteokbokki.webp',lat:37.5336,lng:126.6552,area:'인천 서구 · 청라동',rating:4.8,reviewCount:128,description:'쫀득한 떡에 달큰하게 밴 매운맛. 오늘은 익숙한 한 접시가 당길 때.'},
{isDemo:true,id:'demo-menu-02',placeId:'demo-place-02',name:'얼큰 장칼국수',shop:'청라 국수집 · 가매장',price:9500,heat:2,flavor:'얼큰한',category:'국물·면',image:'/images/jangkalguksu.webp',lat:37.5362,lng:126.6508,area:'인천 서구 · 청라동',rating:4.6,reviewCount:86,description:'뜨끈한 국물부터 한 모금. 면과 국물이 함께 생각나는 날의 선택.'},
{isDemo:true,id:'demo-menu-03',placeId:'demo-place-03',name:'매콤 철판 닭갈비',shop:'청라 철판집 · 가매장',price:14000,heat:4,flavor:'칼칼한',category:'고기·볶음',image:'/images/dakgalbi.webp',lat:37.5298,lng:126.6487,area:'인천 서구 · 청라동',rating:4.7,reviewCount:93,description:'철판에서 피어나는 온기와 매콤한 양념. 여럿이 나누고 싶은 한 끼.'}
];
export const RICH_MENUS:Menu[]=[
 {isDemo:true,id:'rich-demo-menu-01',placeId:'rich-demo-place-01',name:'버섯 크림 파스타',shop:'청라 버터키친 · 가매장',price:16000,heat:3,flavor:'크리미한',category:'파스타',image:'/images/rich-cream-pasta.webp',lat:37.5336,lng:126.6552,area:'인천 서구 · 청라동',description:'버섯 향과 부드러운 크림이 어우러진 가상의 메뉴입니다.'},
 {isDemo:true,id:'rich-demo-menu-02',placeId:'rich-demo-place-02',name:'네 가지 치즈 그라탱',shop:'청라 치즈하우스 · 가매장',price:19000,heat:5,flavor:'치즈 풍미',category:'치즈·그라탱',image:'/images/rich-cheese-gratin.webp',lat:37.5362,lng:126.6508,area:'인천 서구 · 청라동',description:'녹아내린 치즈를 한껏 즐기는 가상의 메뉴입니다.'},
 {isDemo:true,id:'rich-demo-menu-03',placeId:'rich-demo-place-03',name:'버터 소금빵 세트',shop:'청라 소금베이크 · 가매장',price:9500,heat:2,flavor:'버터 풍미',category:'베이커리',image:'/images/rich-butter-rolls.webp',lat:37.5298,lng:126.6487,area:'인천 서구 · 청라동',description:'갓 구운 빵의 고소한 버터 향을 떠올려 만든 가상의 메뉴입니다.'},
];
export const money=(n:number)=>n.toLocaleString('ko-KR')+'원';
export type Report={id:string;menu:string;status:string;created_at:string};

// SWEET theme data is kept in this shared catalog so all taste domains use one deployment source.
export const SWEET_HEAT=['은은한 단맛','가벼운 단맛','기분 좋은 단맛','진한 단맛','아주 진한 단맛'];
export const SWEET_FLAVORS=['전체','크리미한','버터리한','프루티한','초콜릿한','고소한'];
export const SWEET_MENU_CATEGORIES=['카페','베이커리','케이크','도넛·쿠키','아이스크림·빙수','초콜릿·캔디','전통 디저트','기타'];
const sweetCard=(title:string,sub:string,bg:string)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="860"><rect width="1200" height="860" fill="${bg}"/><circle cx="930" cy="160" r="130" fill="#fff" opacity=".35"/><circle cx="180" cy="700" r="190" fill="#fff" opacity=".22"/><text x="80" y="600" font-family="Arial,sans-serif" font-size="108" font-weight="700" fill="#16463b">${title}</text><text x="86" y="680" font-family="Arial,sans-serif" font-size="34" fill="#2a6b5d">${sub}</text><text x="86" y="755" font-family="Arial,sans-serif" font-size="24" fill="#487d72">SWEET by NOWGO · 개발용 이미지</text></svg>`);
export const SWEET_MENUS:Menu[]=[
{isDemo:true,id:'demo-menu-01',placeId:'demo-place-01',name:'말차 크림 케이크',shop:'청라 민트카페 · 가매장',price:8900,heat:3,flavor:'크리미한',category:'케이크',image:sweetCard('MATCHA CAKE','cream · tea · soft','#cfeee3'),lat:37.5326,lng:126.6384,area:'인천 서해구 · 청라',description:'쌉싸름한 말차와 부드러운 크림. 커피와 천천히 즐기고 싶은 한 조각.',rating:4.8,reviewCount:142},
{isDemo:true,id:'demo-menu-02',placeId:'demo-place-02',name:'솔티드 버터 크루아상',shop:'가정 베이크샵 · 가매장',price:5200,heat:2,flavor:'버터리한',category:'베이커리',image:sweetCard('BUTTER CROISSANT','salty · flaky · warm','#e8f5d8'),lat:37.5248,lng:126.6736,area:'인천 서해구 · 가정',description:'겹겹이 바삭한 결에 버터 향이 은은하게 남는 디저트. 가볍게 달콤한 날의 선택.',rating:4.7,reviewCount:96},
{isDemo:true,id:'demo-menu-03',placeId:'demo-place-03',name:'우유 젤라또',shop:'검단 스윗바 · 가매장',price:6500,heat:4,flavor:'고소한',category:'아이스크림·빙수',image:sweetCard('MILK GELATO','milk · cool · smooth','#d7f3ec'),lat:37.5949,lng:126.6985,area:'인천 서해구 · 검단',description:'우유의 고소함과 매끈한 단맛. 산책하다 차갑게 한 스푼 당기는 날.',rating:4.6,reviewCount:73}
];
