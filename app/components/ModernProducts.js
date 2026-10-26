"use client";
import ProductCard from "./ProductCard";
import {useCatalogue,CatalogueMessage} from "./CatalogueProvider";
export default function ModernProducts(){const {products,loading,error}=useCatalogue();const pieces=products.filter(p=>p.collection==='modern');if(loading||error)return <div className="collectionGrid"><CatalogueMessage loading={loading} error={error}/></div>;return pieces.length?<section className="collectionGrid">{pieces.map(p=><ProductCard key={p.id||p.slug} product={p}/>)}</section>:<p className="modernIntro" style={{padding:'28px 20px'}}>Our preloved modern jewellery collection is coming soon. If you have a particular piece in mind, we can help source it for you.</p>}
