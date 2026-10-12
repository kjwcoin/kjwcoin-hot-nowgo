import {verifiedUser,publicDb} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
import {HOT_AD_TERMS,validAdBudget,validAdReference} from '@/lib/hot-ad-policy';
import {hotAdPaymentConfig} from '@/lib/hot-ad-payments';
import {isKoreanCoordinate} from '@/lib/korean-region';

export async function GET(request:Request){
 try{
  const url=new URL(request.url);
  if(url.searchParams.get('action')==='slot'){
   const lat=Number(url.searchParams.get('lat')),lng=Number(url.searchParams.get('lng'));
   if(!url.searchParams.has('lat')||!url.searchParams.has('lng')||!isKoreanCoordinate(lat,lng))return reply(request,{slot:null});
   const {data,error}=await publicDb().rpc('ng_hot_ad_slot',{p_lat:lat,p_lng:lng});
   if(error)throw error;
   return reply(request,{slot:data?.[0]||null});
  }
  const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
  const admin=url.searchParams.get('action')==='admin';
  if(admin){const check=await auth.client.rpc('is_admin');if(check.error||check.data!==true)return reply(request,{error:'광고 관리자 권한이 필요합니다.'},403);}
  const [auctions,bids,stores]=await Promise.all([
   auth.client.from('ng_hot_ad_auctions').select('*').order('starts_at',{ascending:false}).limit(50),
   auth.client.from('ng_hot_ad_bids').select('id,auction_id,store_id,menu_id,budget,ramen_reference,status,review_status,submitted_at,payment_due_at').order('budget',{ascending:false}).limit(200),
   auth.client.from('stores').select('id,name').eq('owner_id',auth.user.id).is('archived_at',null)
  ]);
  if(auctions.error||bids.error||stores.error)throw auctions.error||bids.error||stores.error;
  const ids=(stores.data||[]).map(x=>x.id);
  const products=ids.length?await auth.client.from('ng_owner_featured_taste_menus').select('id,menu,shop,owner_store_id,heat,price').eq('planet','hot').in('owner_store_id',ids):{data:[],error:null};
  if(products.error)throw products.error;
  const menuIds=(bids.data||[]).map(x=>x.menu_id);
  const details=admin&&menuIds.length?await auth.client.from('ng_owner_featured_taste_menus').select('id,menu,shop,heat').in('id',menuIds):{data:[],error:null};
  if(details.error)throw details.error;
  return reply(request,{auctions:auctions.data,bids:(bids.data||[]).map(b=>({...b,product:details.data?.find(p=>p.id===b.menu_id)})),products:products.data,admin,paymentReady:hotAdPaymentConfig().ready});
 }catch{return reply(request,{error:'광고 정보를 불러오지 못했습니다. 다시 확인해 주세요.'},503);}
}

export async function POST(request:Request){
 try{
  if(!request.headers.get('origin')||!validOrigin(request))return reply(request,{error:'같은 사이트에서 신청해 주세요.'},403);
  const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'점주 계정으로 로그인해 주세요.'},401);
  const raw=await request.text();if(raw.length>4096)return reply(request,{error:'입력을 확인해 주세요.'},413);
  const body=JSON.parse(raw);let result;
  if(body.action==='bid'){
   if(!validAdBudget(body.budget)||!validAdReference(body.reference)||body.terms!==HOT_AD_TERMS)return reply(request,{error:'8,000원 이상 예산과 광고 약관을 확인해 주세요.'},400);
   result=await auth.client.rpc('ng_hot_ad_submit',{p_auction:body.auctionId,p_store:body.storeId,p_menu:body.menuId,p_budget:body.budget,p_reference:body.reference,p_terms:body.terms});
  }else if(body.action==='create'){
   if(typeof body.region!=='string'||!body.region.trim()||!isKoreanCoordinate(body.lat,body.lng)||!/^\d{4}-\d{2}-01$/.test(body.month))return reply(request,{error:'지역·좌표·노출 월을 확인해 주세요.'},400);
   result=await auth.client.rpc('ng_hot_ad_create_auction',{p_region:body.region,p_lat:body.lat,p_lng:body.lng,p_month:body.month});
  }else if(body.action==='review'&&typeof body.approved==='boolean')result=await auth.client.rpc('ng_hot_ad_review',{p_bid:body.bidId,p_approved:body.approved});
  else if(body.action==='suspend')result=await auth.client.rpc('ng_hot_ad_suspend',{p_auction:body.auctionId});
  else if(body.action==='award')result=await auth.client.rpc('ng_hot_ad_award',{p_auction:body.auctionId});
  else return reply(request,{error:'지원하지 않는 광고 작업입니다.'},400);
  if(result.error)return reply(request,{error:'신청 또는 선정 조건을 확인해 주세요. 관리자 권한·마감시각·매장 소유권을 확인해야 합니다.'},400);
  return reply(request,{id:result.data,message:body.action==='bid'?'입찰을 접수했습니다. 낙찰자만 결제합니다.':'광고 운영 상태를 저장했습니다.'});
 }catch{return reply(request,{error:'저장하지 못했습니다. 입력한 내용은 유지됩니다.'},503);}
}
