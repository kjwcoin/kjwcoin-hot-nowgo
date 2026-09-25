export const EXPERIENCE_KEYS=['hot','rich','sweet'] as const;
export type ExperienceKey=(typeof EXPERIENCE_KEYS)[number];

export type ExperienceProfile={
 key:ExperienceKey;
 name:string;
 host:string;
 accent:string;
 logo:string;
 title:string;
 description:string;
 intensityLabel:string;
 intensity:string[];
 flavors:string[];
 categories:string[];
 searchPlaceholder:string;
 heroEyebrow:string;
 heroTitle:string;
 heroSupport:string;
 sourceLabel:string;
 sampleImage:string;
 sampleMenus:Array<{name:string;shop:string;price:number;intensity:number;flavor:string;category:string;description:string}>;
};

export const EXPERIENCES:Record<ExperienceKey,ExperienceProfile>={
 hot:{key:'hot',name:'HOT',host:'hot.nowgo.space',accent:'#c34227',logo:'/images/nowgo-red.png',title:'매운 메뉴 지도',description:'맵기, 맛의 결, 메뉴와 한 끼 예산으로 전국의 매운 한 접시를 찾아요.',intensityLabel:'매운맛 단계',intensity:['순한맛','약간 매운맛','보통 매운맛','매운맛','아주 매운맛'],flavors:['전체','얼큰한','칼칼한','달콤매콤한','알싸한'],categories:['분식','국물·면','고기·볶음','닭발','족발','해산물','기타'],searchPlaceholder:'닭발, 떡볶이, 얼큰 칼국수',heroEyebrow:'전국에서 찾는 매운 메뉴 지도',heroTitle:'핫한 맛부심',heroSupport:'내가 아는 그 한 접시. 누군가의 오늘 메뉴가 되도록.',sourceLabel:'hot',sampleImage:'/images/tteokbokki.webp',sampleMenus:[{name:'달콤매콤 떡볶이',shop:'청라 분식집 · 가매장',price:6500,intensity:3,flavor:'달콤매콤한',category:'분식',description:'쫀득한 떡에 달큰하게 밴 매운맛.'},{name:'얼큰 장칼국수',shop:'청라 국수집 · 가매장',price:9500,intensity:2,flavor:'얼큰한',category:'국물·면',description:'뜨끈한 국물이 생각나는 날의 선택.'},{name:'매콤 철판 닭갈비',shop:'청라 철판집 · 가매장',price:14000,intensity:4,flavor:'칼칼한',category:'고기·볶음',description:'여럿이 나누고 싶은 매콤한 한 끼.'}]},
 rich:{key:'rich',name:'RICH',host:'rich.nowgo.space',accent:'#b4936c',logo:'/images/nowgo-rich.svg',title:'느끼한 맛 지도',description:'느끼한 단계, 맛의 결, 메뉴와 한 끼 예산으로 대한민국의 진한 한 접시를 찾아요.',intensityLabel:'느끼한 단계',intensity:['가볍게','은은하게','제법 진하게','아주 진하게','묵직하게'],flavors:['전체','rich','creamy','buttery','greasy','oily','heavy','heavy&rich'],categories:['크림파스타','치즈','버거','튀김','고기','소스','기타'],searchPlaceholder:'크림파스타, 치즈버거, 버터구이',heroEyebrow:'대한민국에서 시작하는 진한 맛 지도',heroTitle:'리치한 맛부심',heroSupport:'꾸덕하고 고소한 그 한 접시. 오늘 당기는 정도로 골라요.',sourceLabel:'rich',sampleImage:'/images/rich-plate.svg',sampleMenus:[{name:'꾸덕 크림 파스타',shop:'청라 키친 · 가매장',price:15000,intensity:4,flavor:'creamy',category:'크림파스타',description:'크림과 치즈가 묵직하게 감기는 한 접시.'},{name:'더블 치즈 버거',shop:'청라 버거집 · 가매장',price:12000,intensity:3,flavor:'heavy&rich',category:'버거',description:'고기와 치즈의 진한 균형.'},{name:'버터 갈릭 감자',shop:'청라 펍 · 가매장',price:8500,intensity:2,flavor:'buttery',category:'튀김',description:'버터 향이 은은하게 남는 바삭한 메뉴.'}]},
 sweet:{key:'sweet',name:'SWEET',host:'sweet.nowgo.space',accent:'#35bfa7',logo:'/images/nowgo-sweet.svg',title:'디저트 지도',description:'스윗한 단계, 맛의 결, 디저트 메뉴와 한 끼 예산으로 대한민국의 달콤한 한 접시를 찾아요.',intensityLabel:'스윗한 단계',intensity:['은은한 단맛','가벼운 단맛','균형 잡힌 단맛','진한 단맛','아주 진한 단맛'],flavors:['전체','달콤한','상큼달콤한','고소달콤한','쌉쌀달콤한'],categories:['케이크','빵·페이스트리','아이스크림','쿠키·구움과자','전통디저트','음료','기타'],searchPlaceholder:'케이크, 휘낭시에, 젤라토',heroEyebrow:'대한민국에서 시작하는 디저트 지도',heroTitle:'스윗한 맛부심',heroSupport:'지금 당기는 달콤한 한 접시. 취향과 예산으로 골라요.',sourceLabel:'sweet',sampleImage:'/images/sweet-plate.svg',sampleMenus:[{name:'민트 크림 케이크',shop:'청라 케이크룸 · 가매장',price:8500,intensity:4,flavor:'달콤한',category:'케이크',description:'부드러운 크림과 촉촉한 시트의 한 조각.'},{name:'레몬 마들렌',shop:'청라 베이크숍 · 가매장',price:3800,intensity:2,flavor:'상큼달콤한',category:'쿠키·구움과자',description:'레몬 향이 가볍게 번지는 구움과자.'},{name:'피스타치오 젤라토',shop:'청라 젤라테리아 · 가매장',price:6000,intensity:3,flavor:'고소달콤한',category:'아이스크림',description:'고소함과 단맛이 천천히 이어지는 디저트.'}]}
};

export function experienceFromHost(host:string|undefined|null):ExperienceKey{
 const value=(host||'').split(':')[0].toLowerCase();
 if(value==='rich.nowgo.space')return 'rich';
 if(value==='sweet.nowgo.space')return 'sweet';
 if(value==='localhost'||value==='127.0.0.1'||value.endsWith('.vercel.app')){
  const preview=process.env.NOWGO_EXPERIENCE;
  if(preview==='rich'||preview==='sweet')return preview;
 }
 return 'hot';
}

export function experienceFromRequest(req:Request){return experienceFromHost(req.headers.get('host')||new URL(req.url).hostname)}
export const EXPERIENCE_VERSION='2026-09-25-ecosystem-v1';
