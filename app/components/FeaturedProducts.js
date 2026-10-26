"use client";
import ProductCard from "./ProductCard";
import {useCatalogue,CatalogueMessage,isFeatured} from "./CatalogueProvider";
export default function FeaturedProducts({limit,home=false}){const {products,loading,error}=useCatalogue();const all=products.filter(p=>isFeatured(p)&&!p.sold).sort((a,b)=>(a.featuredOrder??100)-(b.featuredOrder??100));const pieces=limit?all.slice(0,limit):all;return <>{loading||error||!pieces.length?<CatalogueMessage loading={loading} error={error}/>:<div className={home?'featuredGrid':'collectionGrid'}>{pieces.map(p=><ProductCard key={p.id||p.slug} product={p}/>)}</div>}{home&&<a className="cardButton" href="/featured" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',marginTop:24,minWidth:160}}>See more</a>}</>}
