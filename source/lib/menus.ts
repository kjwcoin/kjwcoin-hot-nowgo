export const HEAT=['순한맛','약간 매운맛','보통 매운맛','매운맛','아주 매운맛'];
export const FLAVORS=['전체','얼큰한','칼칼한','달콤매콤한','알싸한'];
export type Menu={id:string,placeId:string,name:string,shop:string,price:number,heat:number,flavor:string,category:string,image:string,lat:number|null,lng:number|null,area:string,description:string,isDemo:boolean,reportedAt?:string,verifiedOwner?:boolean,nowgoSlug?:string|null};
export const MENU_CATEGORIES=['분식','국물·면','고기·볶음','닭발','족발','해산물','기타'];
export const RICH_HEAT=['담백','고소','크리미','버터·치즈 진하게','묵직하게 진한 맛'];
export const RICH_FLAVORS=['전체','고소한','크리미한','버터 풍미','치즈 풍미','기름진'];
export const RICH_MENU_CATEGORIES=['파스타','치즈·그라탱','베이커리','디저트','고기·튀김','기타'];
export const MENUS:Menu[]=[
{isDemo:true,id:'demo-menu-01',placeId:'demo-place-01',name:'달콤매콤 떡볶이',shop:'청라 분식집 · 가매장',price:6500,heat:3,flavor:'달콤매콤한',category:'분식',image:'/images/tteokbokki.webp',lat:37.5336,lng:126.6552,area:'인천 서구 · 청라동',description:'쫀득한 떡에 달큰하게 밴 매운맛. 오늘은 익숙한 한 접시가 당길 때.'},
{isDemo:true,id:'demo-menu-02',placeId:'demo-place-02',name:'얼큰 장칼국수',shop:'청라 국수집 · 가매장',price:9500,heat:2,flavor:'얼큰한',category:'국물·면',image:'/images/jangkalguksu.webp',lat:37.5362,lng:126.6508,area:'인천 서구 · 청라동',description:'뜨끈한 국물부터 한 모금. 면과 국물이 함께 생각나는 날의 선택.'},
{isDemo:true,id:'demo-menu-03',placeId:'demo-place-03',name:'매콤 철판 닭갈비',shop:'청라 철판집 · 가매장',price:14000,heat:4,flavor:'칼칼한',category:'고기·볶음',image:'/images/dakgalbi.webp',lat:37.5298,lng:126.6487,area:'인천 서구 · 청라동',description:'철판에서 피어나는 온기와 매콤한 양념. 여럿이 나누고 싶은 한 끼.'}
];
export const RICH_MENUS:Menu[]=[
 {isDemo:true,id:'rich-demo-menu-01',placeId:'rich-demo-place-01',name:'버섯 크림 파스타',shop:'청라 버터키친 · 가매장',price:16000,heat:3,flavor:'크리미한',category:'파스타',image:'/images/rich-cream-pasta.webp',lat:37.5336,lng:126.6552,area:'인천 서구 · 청라동',description:'버섯 향과 부드러운 크림이 어우러진 가상의 메뉴입니다.'},
 {isDemo:true,id:'rich-demo-menu-02',placeId:'rich-demo-place-02',name:'네 가지 치즈 그라탱',shop:'청라 치즈하우스 · 가매장',price:19000,heat:5,flavor:'치즈 풍미',category:'치즈·그라탱',image:'/images/rich-cheese-gratin.webp',lat:37.5362,lng:126.6508,area:'인천 서구 · 청라동',description:'녹아내린 치즈를 한껏 즐기는 가상의 메뉴입니다.'},
 {isDemo:true,id:'rich-demo-menu-03',placeId:'rich-demo-place-03',name:'버터 소금빵 세트',shop:'청라 소금베이크 · 가매장',price:9500,heat:2,flavor:'버터 풍미',category:'베이커리',image:'/images/rich-butter-rolls.webp',lat:37.5298,lng:126.6487,area:'인천 서구 · 청라동',description:'갓 구운 빵의 고소한 버터 향을 떠올려 만든 가상의 메뉴입니다.'},
];
export const money=(n:number)=>n.toLocaleString('ko-KR')+'원';
export type Report={id:string;menu:string;status:string;created_at:string};
