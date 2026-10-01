import Brand from '@/components/brand';

export default function FlavorHeader() {
  return <header className="site-header flavor-page-header">
    <Brand/>
    <a className="flavor-header-back" href="/">메뉴 지도로</a>
  </header>;
}
