export const HEAT=['가볍게 고소한','부드럽게 크리미한','버터 풍미가 진한','기름진 풍미가 강한','묵직하고 리치한'];
export const FLAVORS=['전체','리치한','크리미한','버터리한','기름진','오일리한','묵직한','헤비&리치'];
export type Menu={id:string,placeId:string,name:string,shop:string,price:number,heat:number,flavor:string,category:string,image:string,lat:number|null,lng:number|null,area:string,description:string,isDemo:boolean,reportedAt?:string,verifiedOwner?:boolean,nowgoSlug?:string|null};
export const MENU_CATEGORIES=['파스타','치즈·그라탱','베이커리','디저트','고기·튀김','기타'];
const card=(title:string,sub:string,bg:string)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="860"><rect width="1200" height="860" fill="${bg}"/><circle cx="930" cy="160" r="130" fill="#fff" opacity=".28"/><circle cx="180" cy="700" r="190" fill="#fff" opacity=".18"/><text x="80" y="600" font-family="Arial,sans-serif" font-size="92" font-weight="700" fill="#4b3a2b">${title}</text><text x="86" y="680" font-family="Arial,sans-serif" font-size="34" fill="#7b6247">${sub}</text><text x="86" y="755" font-family="Arial,sans-serif" font-size="24" fill="#8d765a">RICH by NOWGO · 개발용 이미지</text></svg>`);
export const MENUS:Menu[]=[
{isDemo:true,id:'demo-rich-01',placeId:'demo-rich-place-01',name:'트러플 크림 파스타',shop:'청라 크림키친 · 가매장',price:18900,heat:4,flavor:'크리미한',category:'파스타',image:card('TRUFFLE CREAM','cream · truffle · rich','#eadfcd'),lat:37.5326,lng:126.6384,area:'인천 서해구 · 청라',description:'진한 크림과 트러플 향을 상상한 개발용 예시 메뉴입니다. 실제 매장이나 가격이 아닙니다.'},
{isDemo:true,id:'demo-rich-02',placeId:'demo-rich-place-02',name:'버터 치즈 그라탱',shop:'가정 버터하우스 · 가매장',price:15900,heat:5,flavor:'헤비&리치',category:'치즈·그라탱',image:card('CHEESE GRATIN','butter · cheese · heavy','#e5d6bd'),lat:37.5248,lng:126.6736,area:'인천 서해구 · 가정',description:'버터와 치즈가 묵직하게 겹치는 느낌을 표현한 개발용 예시 메뉴입니다. 실제 매장이 아닙니다.'},
{isDemo:true,id:'demo-rich-03',placeId:'demo-rich-place-03',name:'버터 프렌치토스트',shop:'검단 리치플레이트 · 가매장',price:12900,heat:3,flavor:'버터리한',category:'디저트',image:card('BUTTER TOAST','buttery · soft · warm','#f0e6d6'),lat:37.5949,lng:126.6985,area:'인천 서해구 · 검단',description:'따뜻한 버터 풍미를 강조한 개발용 예시 메뉴입니다. 사진과 가격 모두 시안용입니다.'}
];
export const money=(n:number)=>n.toLocaleString('ko-KR')+'원';
export type Report={id:string;menu:string;status:string;created_at:string};
