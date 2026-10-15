import Link from 'next/link';
import styles from './naver-reference-search.module.css';

export default function NaverReferenceSearch(){
 return <main className={styles.page}>
  <Link href="/">← HOT 지도로 돌아가기</Link>
  <h1>네이버 검색 기능 중단</h1>
  <p className={styles.notice}>네이버 검색 기능은 중단되었습니다. HOT 지도에서 등록된 매장과 메뉴를 검색해 주세요.</p>
 </main>;
}
