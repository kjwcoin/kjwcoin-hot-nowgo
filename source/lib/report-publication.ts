/** Keep a draft and its private upload until publication is positively confirmed. */
export type Receipt = {id:string;status:string};
export type StepError = {code?:string;statusCode?:string|number;message?:string};
export async function publishReport(steps:{
 find:()=>Promise<Receipt|null>;
 insert:()=>Promise<StepError|null>;
 upload:()=>Promise<StepError|null>;
 publish:()=>Promise<{status:unknown;error:StepError|null}>;
}):Promise<Receipt>{
 let row=await steps.find();
 if(row?.status==='published_unverified')return row;
 if(row&&row.status!=='draft')throw new Error('이 제보는 삭제되었어요. 새 제보를 작성해 주세요.');
 if(!row){
  const error=await steps.insert();
  if(error){
   if(error.code!=='23505')throw error;
   row=await steps.find();
   if(row?.status==='published_unverified')return row;
   if(!row||row.status!=='draft')throw error;
  }
 }
 const uploadError=await steps.upload();
 // A retry may encounter the same immutable object uploaded by its first request.
 if(uploadError&&!['409','400'].includes(String(uploadError.statusCode))&&!/already.?exists|duplicate/i.test(uploadError.message||''))throw uploadError;
 if(uploadError&&!/already.?exists|duplicate|resourcealreadyexists|keyalreadyexists/i.test(`${uploadError.code||''} ${uploadError.message||''}`))throw uploadError;
 const result=await steps.publish();
 row=await steps.find();
 // A timed-out RPC may have committed. The persisted receipt is authoritative.
 if(row?.status==='published_unverified')return row;
 if(result.error)throw result.error;
 throw new Error('아직 제보 접수가 완료되지 않았어요. 같은 화면에서 다시 제출해 주세요.');
}
export const koreanToday=(now=new Date())=>new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10);
