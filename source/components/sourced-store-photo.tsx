import {ImageOff} from 'lucide-react';

/** The old photo slot is retained without inventing an image for a sourced fact. */
export default function SourcedStorePhoto({name,detail=false}:{name:string;detail?:boolean}){
 return <span className={`source-photo-placeholder ${detail?'explorer-detail-photo':'source-menu-photo'}`} role="img" aria-label={`${name} 사진 미등록`}>
  <ImageOff size={detail?26:18} aria-hidden="true"/>
  <small>사진 미등록</small>
 </span>;
}
