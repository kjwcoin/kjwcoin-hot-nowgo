import {Webhook} from '@portone/server-sdk';
import {createClient} from '@supabase/supabase-js';
import {publicConfig} from '@/lib/supabase';
import {hotAdPaymentConfig,fetchAdPayment,isConfirmedAdPayment,isRefundedAdPayment,matchesAdPayment} from '@/lib/hot-ad-payments';
export async function POST(request:Request){
 const config=hotAdPaymentConfig();if(!config.ready)return new Response('payment_not_ready',{status:503});
 const raw=await request.text();if(raw.length>65536)return new Response('too_large',{status:413});
 let webhook;
 try{webhook=await Webhook.verify(config.webhookSecret,raw,Object.fromEntries(request.headers))}catch{return new Response('invalid_signature',{status:400})}
 if(!('data' in webhook)||!('paymentId' in webhook.data)||webhook.data.storeId!==config.storeId)return new Response('ignored');
 try{
  const paymentId=webhook.data.paymentId,db=createClient(publicConfig().url,config.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:order,error}=await db.from('ng_hot_ad_orders').select('order_id,amount,payment_key,paid_at,bid_id').eq('order_id',paymentId).maybeSingle();if(error)throw error;if(!order)return new Response('ignored');
  const payment=await fetchAdPayment(paymentId,config);
  if(isConfirmedAdPayment(payment,order.order_id,order.amount,config)){
   const saved=await db.rpc('ng_hot_ad_confirm',{p_order:order.order_id,p_key:payment.transactionId,p_amount:order.amount});if(saved.error)throw saved.error;
  }else if(isRefundedAdPayment(payment,order.order_id,order.amount,config)&&order.paid_at&&payment.transactionId===order.payment_key){
   const saved=await db.rpc('ng_hot_ad_refund',{p_order:order.order_id,p_key:order.payment_key});if(saved.error)throw saved.error;
  }else if(payment.status==='PARTIAL_CANCELLED'&&matchesAdPayment(payment,order.order_id,order.amount,config)&&payment.transactionId===order.payment_key){
   const saved=await db.from('ng_hot_ad_bids').update({status:'refund_pending'}).eq('id',order.bid_id);if(saved.error)throw saved.error;
  }
  return new Response('ok');
 }catch{return new Response('reconciliation_pending',{status:503})}
}
