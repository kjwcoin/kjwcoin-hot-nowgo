import {publicSourcedStore,type PublicSourcedStore} from './sourced-store.ts';
/** Opt-in review fixture only. Never enabled for a production deployment. */
export function sourcePreviewEnabled(){
 return process.env.HOT_SOURCE_PREVIEW_ONLY==='true'&&process.env.VERCEL_ENV==='preview';
}
/** Exact licensed record copied from the reviewed public-source manifest, not a customer report. */
export function sourcePreviewStore():PublicSourcedStore {
 const store=publicSourcedStore({id:'fb31d9c8-c552-5610-a2b5-447beeea75b7',slug:'hot-busan-1531',name:'할매집회국수',address:'부산광역시 중구 남포길 25-3',lat:35.09885,lon:129.03146,
  owner_id:null,archived_at:null,trust_disabled_at:null,owner_penalty_points:0,publication_state:'DISCOVERED',source_ref:'data-go-kr-15084242-1531',
  source_metadata:{planet:'hot',sourceUrl:'https://www.data.go.kr/data/15084242/fileData.do',licenseName:'이용허락범위 제한 없음',sourceAsOf:null,checkedAt:'2026-10-12T07:01:34Z',
   rights:{factsStorage:true,publicDisplay:true},menus:[{id:'data-go-kr-15084242-1531:menu:1',name:'회비빔국수'}],reporting:{state:'pending'}}});
 if(!store)throw Error('invalid_preview_fixture');
 return store;
}
