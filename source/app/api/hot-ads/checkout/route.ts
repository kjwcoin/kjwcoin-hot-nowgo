import {createClient} from '@supabase/supabase-js';
import {verifiedUser,publicConfig} from '@/lib/supabase';
import {reply,validOrigin} from '@/lib/server';
import {hotAdPaymentConfig,isConfirmedAdPayment,isRefundedAdPayment,matchesAdPayment,fetchAdPayment} from '@/lib/hot-ad-payments';
export async function POST(request:Request){
 try{
  if(!request.headers.get('origin')||!validOrigin(request))return reply(request,{error:'요청 출처를 확인해 주세요.'},403);
  const auth=await verifiedUser(request);if(!auth)return reply(request,{error:'점주 로그인이 필요합니다.'},401);
  const config=hotAdPaymentConfig();if(!config.ready)return reply(request,{error:'NHN KCP 광고 결제 연결을 준비 중입니다. 현재 결제되거나 광고가 시작되지 않습니다.',code:'payment_not_ready'},503);
  const raw=await request.text();if(raw.length>2048)return reply(request,{error:'입력을 확인해 주세요.'},413);
  const body=JSON.parse(raw);if(!['start','confirm','refund'].includes(body.action)||typeof body.bidId!=='string')return reply(request,{error:'주문 정보를 확인해 주세요.'},400);
  const db=createClient(publicConfig().url,config.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  if(body.action==='refund'){
   const admin=await auth.client.rpc('is_admin');if(admin.error||admin.data!==true)return reply(request,{error:'환불 관리자 권한이 필요합니다.'},403);
   const receipt=await auth.client.from('ng_hot_ad_orders').select('order_id,amount,payment_key,paid_at,refunded_at').eq('bid_id',body.bidId).maybeSingle();
   const order=receipt.data;if(receipt.error||!order?.paid_at||!order.payment_key)return reply(request,{error:'확인된 결제 내역이 없습니다.'},409);
   let payment=await fetchAdPayment(order.order_id,config);
   if(!matchesAdPayment(payment,order.order_id,order.amount,config)||payment.transactionId!==order.payment_key)return reply(request,{error:'환불할 결제를 확인하지 못했습니다.'},409);
   if(payment.status==='PAID'||payment.status==='PARTIAL_CANCELLED'){
    const bid=await db.from('ng_hot_ad_bids').select('auction_id').eq('id',body.bidId).single();if(bid.error)throw bid.error;
    const stop=await auth.client.rpc('ng_hot_ad_suspend',{p_auction:bid.data.auction_id});if(stop.error)throw stop.error;
    await fetch('https://api.portone.io/payments/'+encodeURIComponent(order.order_id)+'/cancel',{method:'POST',headers:{Authorization:'PortOne '+config.secret,'Content-Type':'application/json'},body:JSON.stringify({storeId:config.storeId,reason:'광고 관리자 승인 전액 환불',requester:'ADMIN'}),signal:AbortSignal.timeout(15000)});
    payment=await fetchAdPayment(order.order_id,config);
   }
   if(!isRefundedAdPayment(payment,order.order_id,order.amount,config))return reply(request,{error:'전액 환불 완료를 확인하지 못했습니다. 광고는 중단된 상태로 재확인해 주세요.'},409);
   const saved=await db.rpc('ng_hot_ad_refund',{p_order:order.order_id,p_key:order.payment_key});if(saved.error)throw saved.error;
   return reply(request,{message:'전액 환불을 확인하고 광고 노출을 중단했습니다.'});
  }
  const {data:order,error}=await auth.client.rpc('ng_hot_ad_checkout',{p_bid:body.bidId});
  if(error||!order)return reply(request,{error:'본인 낙찰 건과 결제 기한을 확인해 주세요.'},403);
  if(body.action==='start')return reply(request,{...order,storeId:config.storeId,channelKey:config.channelKey,orderName:'우리 집 매운맛 · 지역 광고 1개월'});
  if(body.paymentId!==order.orderId)return reply(request,{error:'주문번호를 확인해 주세요.'},400);
  const payment=await fetchAdPayment(order.orderId,config);
  if(!isConfirmedAdPayment(payment,order.orderId,order.amount,config))return reply(request,{error:'실제 KCP 결제 완료를 확인하지 못했습니다. 같은 주문으로 재확인해 주세요.'},409);
  const activated=await db.rpc('ng_hot_ad_confirm',{p_order:order.orderId,p_key:payment.transactionId,p_amount:order.amount});
  if(activated.error)return reply(request,{error:'결제는 확인했지만 광고 연결을 완료하지 못했습니다. 같은 주문으로 재확인해 주세요.',code:'payment_activation_pending'},503);
  return reply(request,{paid:true,startsAt:order.startsAt,endsAt:order.endsAt,message:'KCP 결제를 확인했습니다. 선정된 월에 광고가 노출됩니다.'});
 }catch{return reply(request,{error:'결제·환불 결과를 확인하지 못했습니다. 같은 주문으로 재확인해 주세요.'},503)}
}
