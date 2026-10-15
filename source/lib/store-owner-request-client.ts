import {STORE_UUID,parseOwnerInformationRequestState,type OwnerInformationRequestState} from './sourced-store.ts';
export type StoreOwnerRequestView={data:OwnerInformationRequestState|null;busy:boolean;message:string;loginRequired:boolean};
export const initialStoreOwnerRequestView=():StoreOwnerRequestView=>({data:null,busy:false,message:'',loginRequired:false});
type Dependencies={storeId:string;request:(path:string,options?:RequestInit)=>Promise<unknown>;onState:(view:StoreOwnerRequestView)=>void;onSaved?:()=>void};
/** No durable submit intent: returning from login only refreshes server state. */
export function createStoreOwnerRequestController({storeId,request,onState,onSaved}:Dependencies){
 if(!STORE_UUID.test(storeId))throw Error('invalid_store');
 let view=initialStoreOwnerRequestView(),sequence=0,disposed=false,saving=false;
 const emit=(next:StoreOwnerRequestView)=>{if(!disposed){view=next;onState(next)}};
 const current=(run:number)=>!disposed&&run===sequence;
 async function load(){
  if(disposed||saving)return;
  const run=++sequence;
  try{const data=parseOwnerInformationRequestState(await request('/api/store-owner-join-requests?storeId='+encodeURIComponent(storeId)));if(current(run))emit({...view,data})}
  catch{if(current(run))emit({...view,data:null})}
 }
 async function submit(){
  if(disposed||saving||view.data?.requested||view.data?.ownerRegistered)return;
  saving=true;const run=++sequence;emit({...view,busy:true,message:'',loginRequired:false});
  try{
   const data=parseOwnerInformationRequestState(await request('/api/store-owner-join-requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({storeId})}));
   if(!current(run))return;
   emit({data,busy:false,message:'점주 영업정보 요청을 남겼어요. 같은 회원의 요청은 이 매장에 한 번만 집계돼요.',loginRequired:false});
   saving=false;onSaved?.();
  }catch(error){
   if(!current(run))return;
   const details=error&&typeof error==='object'?error as {status?:number;code?:string;message?:string}:{};
   emit({...view,busy:false,loginRequired:details.status===401,message:details.message||'요청을 저장하지 못했어요. 다시 눌러 주세요.',
    data:details.status===409&&details.code==='owner_already_registered'?{count:view.data?.count??0,requested:false,ownerRegistered:true}:view.data});
  }finally{if(current(run)){saving=false;if(view.busy)emit({...view,busy:false})}}
 }
 return {load,submit,cancelLogin(){if(!disposed)emit({...view,message:'',loginRequired:false})},
  authChanged(){if(disposed)return;++sequence;saving=false;emit(initialStoreOwnerRequestView());void load()},
  dispose(){disposed=true;++sequence;saving=false}};
}
