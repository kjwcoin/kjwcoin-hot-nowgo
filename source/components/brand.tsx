import BrandWithBeta from './beta-badge';
export default function Brand({className=''}:{className?:string}) {
 return <BrandWithBeta><a className={`brand brand-logo ${className}`} href="/" aria-label="NOWGO 홈"><img className="hot-logo" src="/images/nowgo-logo-20261007.png" alt="NOWGO" width={1986} height={792}/><span className="rich-logo beige-nowgo-logo" aria-hidden="true"/></a></BrandWithBeta>;
}
