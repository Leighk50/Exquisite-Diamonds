"use client";
import {useEffect, useState} from "react";
import ProductCard from "./ProductCard";
import {byCategory} from "../data/products";
const filters = [["all", "All pieces"], ["antique", "Antique & vintage"], ["modern", "Modern"]];
export default function Collection({category,title,intro}) {
  const [filter, setFilter] = useState("all");
  useEffect(() => { const sync = () => setFilter(window.location.hash === "#modern" ? "modern" : "all"); sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync); }, []);
  const pieces = byCategory(category).filter(p => filter === "all" || (p.collection || "antique") === filter);
  function select(value) { setFilter(value); window.history.replaceState(null, "", value === "modern" ? "#modern" : window.location.pathname); }
  return <main><section className="pageHero"><p className="eyebrow">ANTIQUE DIAMONDS</p><h1>{title}</h1><p>{intro}</p></section><div className="collectionFilters" role="group" aria-label="Filter by collection">{filters.map(([value,label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => select(value)}>{label}</button>)}</div><section className="collectionGrid" aria-live="polite">{pieces.length ? pieces.map(p => <ProductCard key={p.slug} product={p}/>) : <div className="collectionEmpty"><span className="reviewDiamond" aria-hidden="true">◆</span><h2>Find your modern treasure</h2><p>Our modern collection is coming soon. Looking for something particular? We can help source a piece for you.</p><a href="/contact#sourcing" className="addBasket sourcingButton">TELL US WHAT YOU ARE LOOKING FOR</a></div>}</section></main>;
}
