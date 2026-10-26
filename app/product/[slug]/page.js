import {products} from '../../data/products';import ProductDetails from '../../components/ProductDetails';
export function generateStaticParams(){return products.map(p=>({slug:p.slug}))}
export default async function Page({params}){const {slug}=await params;return <ProductDetails initialSlug={slug}/>}
