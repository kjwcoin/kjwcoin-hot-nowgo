export default function Brand({className=''}:{className?:string}) {
 return <a className={`brand brand-logo ${className}`} href="/" aria-label="NOWGO 홈"><img className="hot-logo" src="/images/nowgo-red.png" alt="NOWGO" width={2173} height={724}/><span className="rich-logo beige-nowgo-logo" aria-hidden="true"/></a>;
}
