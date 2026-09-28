import type { SiteVariant } from '../site-config';
export type Planet = 'hot' | 'sweet' | 'chewy';
export const planetForVariant = (v: SiteVariant): Planet => v === 'rich' ? 'chewy' : v;
export const WORLDS = {
 hot: {challenge:'매운 건 자신 있다는 탐험가와 우리 집이 가장 맵다는 사장님. 서로의 한 입으로 즐겁게 도전해요.',name:'맵잘알',accent:'#ff7468',motto:'매운맛에 진심.',story:'매운 한 입의 맛과 식감을 알아보는 나. 제보로 발견을 나누고, 인증한 발걸음으로 나만의 영토와 휘장을 쌓는다.',taste:'매운맛',brands:[['삼양 불닭','불꽃 원정단','fire-expedition'],['엽기떡볶이','레드 캐슬','first-alliance'],['농심 신라면','붉은 기사','ramen-knight']]},
 sweet: {challenge:'단맛에도 나만의 기준이 있는 탐험가와 기억에 남는 달콤함을 만드는 사장님. 오늘의 한 입을 함께 찾아요.',name:'단잘알',accent:'#96edd2',motto:'단맛에 진심.',story:'달콤함에도 나만의 기준이 있다. 기억에 남은 한 입을 모아, 나의 디저트 왕국을 넓힌다.',taste:'달콤함',brands:[['메가MGC커피','한 잔의 왕관','sweet-first'],['빙그레 바나나맛우유','바나나 궤도','banana-milk'],['오리온 초코파이','초코 성주','choco-pie']]},
 chewy: {challenge:'쫀득함의 차이를 알아보는 탐험가와 남다른 식감을 만드는 사장님. 씹는 즐거움의 기준을 함께 넓혀요.',name:'쫀잘알',accent:'#cbb2ff',motto:'쫀득함에 진심.',story:'한 입의 탄력, 씹을수록 남는 여운. 맛을 넘어 식감까지 기억하는 나만의 감각으로 영토를 넓힌다.',taste:'쫀득함',brands:[['하리보','골드베어 원정','chewy-alliance'],['공차','펄의 성주','gongcha-pearl'],['롯데웰푸드 말랑카우','말랑 구름','malang-cow']]}
} as const;
export const RANKS = [{name:'탐험가',level:1,xp:0},{name:'기사',level:3,xp:180},{name:'성주',level:5,xp:500},{name:'백작',level:10,xp:2550},{name:'공작',level:20,xp:9550},{name:'왕',level:30,xp:16550}];
const THRESHOLDS=[0,80,180,320,500,750,1050,1450,1950,2550];
export function growth(xp:number){xp=Math.max(0,Math.floor(xp));let level=1;for(let n=0;n<THRESHOLDS.length;n++)if(xp>=THRESHOLDS[n])level=n+1;if(xp>=2550)level=10+Math.floor((xp-2550)/700);const min=level<=10?THRESHOLDS[level-1]:2550+(level-10)*700,next=level<10?THRESHOLDS[level]:2550+(level-9)*700;return {level,min,next,progress:Math.round((xp-min)/(next-min)*100),rank:RANKS.filter(r=>level>=r.level).at(-1)!,character:RANKS.filter(r=>level>=r.level).length-1}}
export const BADGES = [
 {id:'first-step',name:'첫발자국',image:'award-0',rule:'GPS 위치와 결제가 함께 확인된 첫 방문'},
 {id:'steady-recorder',name:'꾸준한 기록가',image:'award-1',rule:'3일 이상에 걸쳐 공개 제보 5회'},
 {id:'plate-collector',name:'한 접시 수집가',image:'award-2',rule:'새로운 매장 5곳에서 방문 인증'},
 {id:'status-keeper',name:'상태지킴이',image:'award-3',rule:'영업·품절 등 상태 제보가 3일에 걸쳐 3회 채택'},
 {id:'world-explorer',name:'세계탐험가',image:'award-4',rule:'해외 매장에서 GPS·결제 방문 인증'},
 {id:'my-regular',name:'나만의 단골',image:'award-5',rule:'미니홈피에서 단골 등록 또는 같은 매장 2일 이상 방문 인증'},
];
export type ActivityEvent={id:string;kind:string;title:string;status:string;occurred_at:string;source_key:string};
export type Visit={id:string;store_id:string|null;shop:string;menu:string;country:string;region:string;visited_on:string;status:string;note:string;taste:number|null;texture:number|null};
export type Photo={id:string;visit_id:string;path:string;bucket?:string;url?:string;created_at:string};
export type Award={id:string;badge_id:string;title:string;image:string;limited:boolean;earned_at:string;campaign_id:string|null};
export type Notice={id:string;title:string;body:string;read_at:string|null;created_at:string};
export type Campaign={id:string;title:string;brand:string;image:string;starts_at:string;ends_at:string;target_visits:number};
export type ReviewItem={id:string;kind:'receipt'|'status';shop:string;label:string;created_at:string;path?:string};
export type ActivitySnapshot={planet:Planet;profile:{nickname:string;character_id:number|null;character_name:string;equipped_badge:string|null};xp:number;stats:{explore:number;record:number;discover:number;steady:number};counts:{visits:number;places:number;reports:number;photos:number;days:number;countries:number};events:ActivityEvent[];visits:Visit[];photos:Photo[];awards:Award[];notifications:Notice[];campaigns:Campaign[];reviews:ReviewItem[];quests:{id:string;title:string;xp:number;done:boolean}[];updated_at:string};
export function emptySnapshot(planet:Planet):ActivitySnapshot{return {planet,profile:{nickname:'나의 탐험가',character_id:null,character_name:'',equipped_badge:null},xp:0,stats:{explore:0,record:0,discover:0,steady:0},counts:{visits:0,places:0,reports:0,photos:0,days:0,countries:0},events:[],visits:[],photos:[],awards:[],notifications:[],campaigns:[],reviews:[],quests:[{id:'report',title:'한 접시 제보',xp:10,done:false},{id:'visit',title:'오늘의 발자국',xp:10,done:false},{id:'status',title:'상태 바로잡기',xp:10,done:false}],updated_at:''}}
