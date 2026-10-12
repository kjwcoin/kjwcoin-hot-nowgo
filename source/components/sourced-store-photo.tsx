/** Keep the legacy photo slot; this existing brand asset is never a food photo. */
export type SourcePreviewPhoto={url:string;nickname:string};
export default function SourcedStorePhoto({detail=false,previewPhoto}:{detail?:boolean;previewPhoto?:SourcePreviewPhoto}){
 if(previewPhoto?.url.startsWith('blob:'))return <span className={`source-photo-preview ${detail?'explorer-detail-photo':'source-menu-photo'}`}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={previewPhoto.url} alt="내가 선택한 메뉴 사진 · 이 화면의 미리보기"/>
  <span className="source-photo-preview-nickname" aria-label={`사진 제보자 닉네임 ${previewPhoto.nickname}`}>{previewPhoto.nickname}</span>
 </span>;
 return <span className={`source-photo-placeholder ${detail?'explorer-detail-photo':'source-menu-photo'}`}>
  {/* The local logo keeps its own aspect ratio inside the unchanged legacy slot. */}
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src="/images/nowgo-red.png" alt="NOWGO 로고 · 매장 사진 미등록" width={2173} height={724}/>
  <small aria-hidden="true">사진 미등록</small>
 </span>;
}
