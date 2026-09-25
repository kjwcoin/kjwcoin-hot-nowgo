export const HEAT=['은은한 단맛','가벼운 단맛','기분 좋은 단맛','진한 단맛','아주 진한 단맛'];
export const FLAVORS=['전체','크리미한','버터리한','프루티한','초콜릿한','고소한'];
export type Menu={id:string,placeId:string,name:string,shop:string,price:number,heat:number,flavor:string,category:string,image:string,lat:number|null,lng:number|null,area:string,description:string,isDemo:boolean,reportedAt?:string,verifiedOwner?:boolean,nowgoSlug?:string|null};
export const MENU_CATEGORIES=['카페','베이커리','케이크','도넛·쿠키','아이스크림·빙수','초콜릿·캔디','전통 디저트','기타'];
const card=(title:string,sub:string,bg:string)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="860"><rect width="1200" height="860" fill="${bg}"/><circle cx="930" cy="160" r="130" fill="#fff" opacity=".35"/><circle cx="180" cy="700" r="190" fill="#fff" opacity=".22"/><text x="80" y="600" font-family="Arial,sans-serif" font-size="108" font-weight="700" fill="#16463b">${title}</text><text x="86" y="680" font-family="Arial,sans-serif" font-size="34" fill="#2a6b5d">${sub}</text><text x="86" y="755" font-family="Arial,sans-serif" font-size="24" fill="#487d72">SWEET by NOWGO · 개발용 이미지</text></svg>`);
export const MENUS:Menu[]=[
{isDemo:true,id:'demo-menu-01',placeId:'demo-place-01',name:'말차 크림 케이크',shop:'청라 민트카페 · 가매장',price:8900,heat:3,flavor:'크리미한',category:'케이크',image:card('MATCHA CAKE','cream · tea · soft','#cfeee3'),lat:37.5326,lng:126.6384,area:'인천 서해구 · 청라',description:'쌉싸름한 말차와 부드러운 크림. 커피와 천천히 즐기고 싶은 한 조각.'},
{isDemo:true,id:'demo-menu-02',placeId:'demo-place-02',name:'솔티드 버터 크루아상',shop:'가정 베이크샵 · 가매장',price:5200,heat:2,flavor:'버터리한',category:'베이커리',image:card('BUTTER CROISSANT','salty · flaky · warm','#e8f5d8'),lat:37.5248,lng:126.6736,area:'인천 서해구 · 가정',description:'겹겹이 바삭한 결에 버터 향이 은은하게 남는 디저트. 가볍게 달콤한 날의 선택.'},
{isDemo:true,id:'demo-menu-03',placeId:'demo-place-03',name:'우유 젤라또',shop:'검단 스윗바 · 가매장',price:6500,heat:4,flavor:'고소한',category:'아이스크림·빙수',image:card('MILK GELATO','milk · cool · smooth','#d7f3ec'),lat:37.5949,lng:126.6985,area:'인천 서해구 · 검단',description:'우유의 고소함과 매끈한 단맛. 산책하다 차갑게 한 스푼 당기는 날.'}
];
export const money=(n:number)=>n.toLocaleString('ko-KR')+'원';
export type Report={id:string;menu:string;status:string;created_at:string};
