"use client";
import {createContext,useContext,useEffect,useState} from "react";
const CatalogueContext=createContext({products:[],loading:true,error:""});
export function CatalogueProvider({children}){
 const [state,setState]=useState({products:[],loading:true,error:""});
 useEffect(()=>{let active=true;async function refresh(){try{const response=await fetch('/api/catalogue',{cache:'no-store'});if(!response.ok)throw Error('The collection is temporarily unavailable. Please try again shortly.');const data=await response.json();if(!Array.isArray(data.products))throw Error('The collection could not be loaded.');if(active)setState({products:data.products,loading:false,error:''});}catch(e){if(active)setState(s=>({...s,loading:false,error:e.message}));}}refresh();const onFocus=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',onFocus);return()=>{active=false;document.removeEventListener('visibilitychange',onFocus)}},[]);
 return <CatalogueContext.Provider value={state}>{children}</CatalogueContext.Provider>;
}
export const useCatalogue=()=>useContext(CatalogueContext);
export function CatalogueMessage({loading,error}){return <p role={error?'alert':'status'}>{error||(loading?'Loading jewellery…':'New pieces will be added soon.')}</p>}
export const isFeatured=p=>p.featured??!!p.justArrived;
