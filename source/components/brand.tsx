export default function Brand({className=''}:{className?:string}) {
 return <a className={`brand brand-logo rich-brand ${className}`} href="/" aria-label="RICH by NOWGO 홈"><span className="rich-brand-mark" aria-hidden="true"/><span className="rich-brand-name">RICH</span></a>;
}
