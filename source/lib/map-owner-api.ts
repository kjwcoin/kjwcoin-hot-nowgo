import sharp from 'sharp';
import {reply} from './server';
export async function readOwnerForm(request:Request){
 const reader=request.body?.getReader();if(!reader)throw Error('invalid_form');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>6*1024*1024){await reader.cancel();throw Error('photo_too_large')}chunks.push(value)}}finally{reader.releaseLock()}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length}
 return new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||''},body}).formData();
}
export async function prepareOwnerPhoto(photo:FormDataEntryValue|null){
 if(!(photo instanceof File)||!photo.size)throw Error('photo_required');
 if(photo.size>5*1024*1024)throw Error('photo_too_large');
 if(!['image/jpeg','image/png','image/webp'].includes(photo.type))throw Error('invalid_photo');
 try{return await sharp(new Uint8Array(await photo.arrayBuffer()),{limitInputPixels:40000000}).autoOrient().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer()}catch{throw Error('invalid_photo')}
}
export function ownerError(request:Request,error:unknown){
 const code=error&&typeof error==='object'&&'message'in error?String(error.message):'unavailable';
 const messages:Record<string,string>={photo_required:'메뉴 사진을 반드시 첨부해 주세요.',photo_too_large:'사진은 5MB 이하로 올려 주세요.',invalid_photo:'JPG·PNG·WebP 사진 파일을 확인해 주세요.',duplicate_menu:'같은 이름의 메뉴가 이미 있습니다.',map_subscription_required:'이 지도의 구독과 매장 권한 확인이 필요합니다.',invalid_taste:'선택한 지도의 맛·단계·결을 확인해 주세요.',invalid_menu:'메뉴 정보를 확인해 주세요.',menu_photo_required:'사진을 포함해 메뉴를 먼저 등록해 주세요.',owned_store_required:'내 매장만 관리할 수 있습니다.'};
 return reply(request,{error:messages[code]||'저장에 연결하지 못했습니다. 입력한 내용은 유지됩니다.',code},code==='map_subscription_required'?402:code==='owned_store_required'?403:messages[code]?400:503);
}
