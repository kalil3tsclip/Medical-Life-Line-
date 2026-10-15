"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
type Place={label:string;lat:number;lon:number};
let mapsReady:Promise<any>|undefined;
function loadMaps(key:string){
 if(!mapsReady)mapsReady=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&v=weekly&loading=async&callback=medicalMapsReady`;
  script.async=true;
  (window as any).medicalMapsReady=()=>resolve((window as any).google.maps);
  script.onerror=()=>{mapsReady=undefined;reject(new Error("Address search unavailable"));};
  document.head.appendChild(script);
 });
 return mapsReady;
}
export function GoogleAddressField({label,onChange,onPick,fallback}:{label:string;value:string;onChange:(v:string)=>void;onPick:(p:Place|null)=>void;fallback:ReactNode}){
 const host=useRef<HTMLDivElement>(null), callbacks=useRef({onChange,onPick});
 callbacks.current={onChange,onPick};
 const [active,setActive]=useState(false),[chosen,setChosen]=useState(""),[error,setError]=useState("");
 useEffect(()=>{
  let disposed=false,widget:any,revision=0;
  (async()=>{
   try{
    const response=await fetch("/api/address-config");const config=await response.json() as {browserKey?:string};
    if(!config.browserKey)return;
    const maps=await loadMaps(config.browserKey);if(disposed)return;
    const {PlaceAutocompleteElement}=await maps.importLibrary("places");if(disposed)return;
    widget=new PlaceAutocompleteElement({includedRegionCodes:["us"],locationBias:{center:{lat:29.6186,lng:-95.5267},radius:50000}});
    widget.setAttribute("aria-label",label);widget.placeholder="Start with a street address or hospital name";
    widget.addEventListener("input",()=>{revision++;setChosen("");setError("");callbacks.current.onPick(null);callbacks.current.onChange("");});
    widget.addEventListener("gmp-select",async({placePrediction}:any)=>{
     const current=++revision;callbacks.current.onPick(null);setError("");
     try{const place=placePrediction.toPlace();await place.fetchFields({fields:["formattedAddress","location"]});
      if(disposed||current!==revision)return;
      if(!place.location||!place.formattedAddress)throw new Error();
      const p={label:place.formattedAddress,lat:place.location.lat(),lon:place.location.lng()};
      callbacks.current.onChange(p.label);callbacks.current.onPick(p);setChosen(p.label);
     }catch{if(!disposed)setError("Could not verify that address. Please select another suggestion.");}
    });
    widget.addEventListener("gmp-error",()=>{if(!disposed){setActive(false);callbacks.current.onPick(null);setError("Address search is temporarily using our backup provider.");}});
    host.current?.appendChild(widget);setActive(true);
   }catch{if(!disposed)setActive(false);}
  })();
  return()=>{disposed=true;widget?.remove();};
 },[label]);
 return <><div className="google-address" hidden={!active}><label>{label}</label><div ref={host}/>{chosen&&<p className="selected-address">Selected: {chosen}</p>}</div>{!active&&fallback}{error&&<p role="status" className="address-help">{error}</p>}</>;
}
