import Link from "next/link";
const categories = [
  {slug:"rings",title:"Modern diamond rings",detail:"New beginnings, lasting promises",symbol:"ring"},
  {slug:"earrings",title:"Modern diamond earrings",detail:"A little brilliance, every day",symbol:"earrings"},
  {slug:"necklaces",title:"Modern diamond necklaces",detail:"Treasures to keep close",symbol:"necklace"}
];
function Jewel({type}) {return <svg viewBox="0 0 160 120" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="2">{type === "ring" ? <><ellipse cx="80" cy="76" rx="29" ry="30"/><path d="M60 36l10-14h20l10 14-20 23zM60 36h40M70 22l10 37 10-37"/></> : type === "earrings" ? <>{[52,108].map(x => <g key={x}><path d={`M${x} 22v20`}/><path d={`M${x-14} 55l14-13 14 13-14 22z`}/><circle cx={x} cy="86" r="9"/></g>)}</> : <><path d="M29 19c0 39 20 59 51 59s51-20 51-59"/><path d="M66 88l14-10 14 10-14 20zM66 88h28M74 81l6 27 6-27"/></>}</g></svg>}
export default function ModernCategories(){return <div className="modernCategories">{categories.map(c => <Link className="modernCategory" key={c.slug} href={`/${c.slug}/#modern`}><div className="modernJewel"><Jewel type={c.symbol}/></div><h3>{c.title}</h3><p>{c.detail}</p><span>EXPLORE {c.slug.toUpperCase()} <span aria-hidden="true">→</span></span></Link>)}</div>}
