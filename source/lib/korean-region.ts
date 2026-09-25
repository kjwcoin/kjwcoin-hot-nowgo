// Check the nationwide administrative prefix; the Kakao geocoder supplies the
// authoritative location when one is available. Coordinates are a sanity bound.
const province = /^(?:서울(?:특별시|시)?|부산(?:광역시|시)?|대구(?:광역시|시)?|인천(?:광역시|시)?|광주(?:광역시|시)?|대전(?:광역시|시)?|울산(?:광역시|시)?|세종(?:특별자치시|시)?|경기(?:도)?|강원(?:특별자치도|도)?|충청북도|충북|충청남도|충남|전라북도|전북(?:특별자치도)?|전라남도|전남|경상북도|경북|경상남도|경남|제주(?:특별자치도|도)?)$/;

export function isKoreanRegion(value: string): boolean {
 return province.test(value.trim());
}

export function isKoreanAddress(value: string): boolean {
 const address=value.trim().replace(/^대한민국\s+/, '');
 if(address.length<8||address.length>200)return false;
 const [region,...rest]=address.split(/\s+/);
 return isKoreanRegion(region)&&rest.join(' ').length>=3;
}

export function isKoreanCoordinate(lat: number|null, lng: number|null): boolean {
 return lat!==null&&lng!==null&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=32.5&&lat<=39&&lng>=124&&lng<=132;
}
