/** Eligibility for licensed, independently verified NAVER Place menu evidence.
 * Do not scrape NAVER Place or create listings merely from the store name.
 * Gate all imports on documented permission and specific menu-level evidence.
 */
export type PlaceMenuEvidence = {
  placeUrl: string;
  menuName: string;
  menuDescription?: string;
  pepperIndicatorVerified?: boolean;
  pepperIndicatorContext?: 'spice_level' | 'decorative' | 'unknown';
  permissionReference?: string;
  // Only trusted, server-side reviewers may set these; never trust client input.
  permissionVerified?: boolean;
  menuEvidenceVerified?: boolean;
  checkedAt: string;
};
export type PlaceMenuDecision = {
  eligible: boolean;
  reason: 'eligible_text' | 'eligible_pepper' | 'missing_permission' |
   'invalid_source' | 'invalid_evidence' | 'no_spicy_menu_evidence';
};
const naverPlace = /^https:\/\/(?:m\.)?(?:place|map)\.naver\.com\//i;
export function classifyNaverSpicyMenu(e: PlaceMenuEvidence): PlaceMenuDecision {
  // A permission reference is not itself verified permission.
  if (!e.permissionReference?.trim() || e.permissionVerified !== true) return {eligible:false,reason:'missing_permission'};
  if (!naverPlace.test(e.placeUrl)) return {eligible:false,reason:'invalid_source'};
  const checkedAt = Date.parse(e.checkedAt);
  if (!e.menuName?.trim() || !Number.isFinite(checkedAt) || checkedAt > Date.now() ||
      e.menuEvidenceVerified !== true) {
    return {eligible:false,reason:'invalid_evidence'};
  }
  // Require menu-specific proof, not an unrelated store title/category/review.
  const menuText = [e.menuName,e.menuDescription||''].join(' ');
  if (menuText.includes('매운맛')) return {eligible:true,reason:'eligible_text'};
  if (e.pepperIndicatorVerified === true && e.pepperIndicatorContext === 'spice_level') {
    return {eligible:true,reason:'eligible_pepper'};
  }
  return {eligible:false,reason:'no_spicy_menu_evidence'};
}
