// Accept the selected original without a file-size cap. Send an optimized image
// so a phone photo fits the hosting request and private storage payload limits.
export async function prepareReportPhoto(photo:File):Promise<File>{
 if(!['image/jpeg','image/png','image/webp'].includes(photo.type))throw Error('JPG·PNG·WebP 사진을 선택해 주세요.');
 const url=URL.createObjectURL(photo);
 try{
  const image=new Image();
  image.src=url;
  await image.decode();
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');
  if(!context)throw Error('사진을 처리하지 못했어요. 다시 시도해 주세요.');
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const encode=(quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('사진을 처리하지 못했어요. 다른 사진을 선택해 주세요.')),'image/jpeg',quality));
  let blob=await encode(.88);
  // This is an internal transfer target, never a restriction on the original.
  for(const quality of [.75,.6,.45]){if(blob.size<=1_500_000)break;blob=await encode(quality)}
  return new File([blob],photo.name.replace(/\.[^.]+$/,'')+'.jpg',{type:blob.type});
 }catch(error){throw error instanceof Error?error:Error('사진을 읽지 못했어요. 다른 사진을 선택해 주세요.')}
 finally{URL.revokeObjectURL(url)}
}
