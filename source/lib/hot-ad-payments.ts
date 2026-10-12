export function hotAdPaymentConfig(){
 const storeId=process.env.HOT_AD_PORTONE_STORE_ID||'',channelKey=process.env.HOT_AD_PORTONE_CHANNEL_KEY||'',secret=process.env.HOT_AD_PORTONE_API_SECRET||'',webhookSecret=process.env.HOT_AD_PORTONE_WEBHOOK_SECRET||'',serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
 return {storeId,channelKey,secret,webhookSecret,serviceKey,ready:process.env.HOT_AD_PORTONE_LIVE_ENABLED==='true'&&!!storeId&&!!channelKey&&!!secret&&!!webhookSecret&&!!serviceKey};
}
export type AdReceipt={id?:string;status?:string;storeId?:string;transactionId?:string;currency?:string;channel?:{key?:string;type?:string;pgProvider?:string};amount?:{total?:number;cancelled?:number}};
export function matchesAdPayment(payment:AdReceipt,orderId:string,amount:number,config:Pick<ReturnType<typeof hotAdPaymentConfig>,'storeId'|'channelKey'>){
 return payment.id===orderId&&payment.storeId===config.storeId&&payment.currency==='KRW'&&payment.amount?.total===amount&&!!payment.transactionId&&payment.channel?.type==='LIVE'&&payment.channel.key===config.channelKey&&payment.channel.pgProvider==='KCP_V2';
}
export function isConfirmedAdPayment(payment:AdReceipt,orderId:string,amount:number,config:Pick<ReturnType<typeof hotAdPaymentConfig>,'storeId'|'channelKey'>){return matchesAdPayment(payment,orderId,amount,config)&&payment.status==='PAID'&&payment.amount?.cancelled===0}
export function isRefundedAdPayment(payment:AdReceipt,orderId:string,amount:number,config:Pick<ReturnType<typeof hotAdPaymentConfig>,'storeId'|'channelKey'>){return matchesAdPayment(payment,orderId,amount,config)&&payment.status==='CANCELLED'&&payment.amount?.cancelled===amount}
export async function fetchAdPayment(paymentId:string,config:ReturnType<typeof hotAdPaymentConfig>):Promise<AdReceipt>{
 const response=await fetch('https://api.portone.io/payments/'+encodeURIComponent(paymentId)+'?storeId='+encodeURIComponent(config.storeId),{headers:{Authorization:'PortOne '+config.secret},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('payment_lookup_failed');return response.json();
}
