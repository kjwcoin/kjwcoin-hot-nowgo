export function regionSearchQuery(query:string){
 const text=query.trim();
 if(!text||text.length>80)return null;
 if(/라면|냉면|쫄면|짜장면|칼국수|떡볶이|닭발/.test(text))return null;
 return /(?:[가-힣]+(?:특별시|광역시|특별자치시|도|시|군|구|읍|면|동|리)|[가-힣]+\d*(?:동|가)\d*)$/.test(text)?text:null;
}
