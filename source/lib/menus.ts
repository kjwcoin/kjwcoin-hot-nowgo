export const HEAT=['순한맛','약간 매운맛','보통 매운맛','매운맛','아주 매운맛'];
export const FLAVORS=['전체','얼큰한','칼칼한','달콤매콤한','알싸한'];
export type Menu={id:string,placeId:string,name:string,shop:string,price:number,heat:number,flavor:string,category:string,image:string,lat:number,lng:number,area:string,description:string,isDemo:boolean,reportedAt?:string};
export const MENU_CATEGORIES=['분식','국물·면','고기·볶음','닭발','족발','해산물','기타'];
export const MENUS:Menu[]=[
{isDemo:true,id:'demo-menu-01',placeId:'demo-place-01',name:'달콤매콤 떡볶이',shop:'연남 분식집 · 가매장',price:6500,heat:3,flavor:'달콤매콤한',category:'분식',image:'/images/tteokbokki.webp',lat:37.5624,lng:126.924,area:'마포구 · 연남동',description:'쫀득한 떡에 달큰하게 밴 매운맛. 오늘은 익숙한 한 접시가 당길 때.'},
{isDemo:true,id:'demo-menu-02',placeId:'demo-place-02',name:'얼큰 장칼국수',shop:'연남 국수집 · 가매장',price:9500,heat:2,flavor:'얼큰한',category:'국물·면',image:'/images/jangkalguksu.webp',lat:37.5629,lng:126.9215,area:'마포구 · 연남동',description:'뜨끈한 국물부터 한 모금. 면과 국물이 함께 생각나는 날의 선택.'},
{isDemo:true,id:'demo-menu-03',placeId:'demo-place-03',name:'매콤 철판 닭갈비',shop:'연남 철판집 · 가매장',price:14000,heat:4,flavor:'칼칼한',category:'고기·볶음',image:'/images/dakgalbi.webp',lat:37.565,lng:126.9225,area:'마포구 · 연남동',description:'철판에서 피어나는 온기와 매콤한 양념. 여럿이 나누고 싶은 한 끼.'}
];
export const money=(n:number)=>n.toLocaleString('ko-KR')+'원';
export type Report={id:string;menu:string;status:string;created_at:string};
