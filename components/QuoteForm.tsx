"use client";
import { useEffect, useState } from "react";
import { GoogleAddressField } from "./GoogleAddressField";
import { Loader2,MapPin } from "lucide-react";
type Place = { label: string; lon: number; lat: number };
const localPlaces: Place[] = [
  { label: "Houston Methodist Hospital, 6565 Fannin Street, Houston, TX 77030", lon: -95.3992, lat: 29.7114 },
  { label: "Memorial Hermann–Texas Medical Center, 6411 Fannin Street, Houston, TX 77030", lon: -95.3974, lat: 29.7139 },
  { label: "MD Anderson Cancer Center, 1515 Holcombe Boulevard, Houston, TX 77030", lon: -95.3974, lat: 29.7071 },
  { label: "Texas Children’s Hospital, 6621 Fannin Street, Houston, TX 77030", lon: -95.4005, lat: 29.7089 },
  { label: "Baylor St. Luke’s Medical Center, 6720 Bertner Avenue, Houston, TX 77030", lon: -95.4002, lat: 29.7078 },
  { label: "Missouri City City Hall, 1522 Texas Parkway, Missouri City, TX 77489", lon: -95.5267, lat: 29.6186 },
];

function FallbackAddressField({ label, value, onChange, onPick }: { label: string; value: string; onChange: (v: string) => void; onPick: (p: Place | null) => void }) {
  const [results, setResults] = useState<Place[]>([]);
  const [selected, setSelected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [open, setOpen] = useState(false);
  const id = label.replaceAll(" ", "-");
  const choose = (p: Place) => { setSelected(true); onChange(p.label); onPick(p); setResults([]); setOpen(false); setHighlight(-1); };
  useEffect(() => { setHighlight(-1); }, [results]);
  useEffect(() => {
    if (selected || value.trim().length < 3) { setResults([]); return; }
    const terms = value.toLowerCase().split(/\s+/).filter(Boolean);
    const localMatches = localPlaces.filter(p => terms.every(term => p.label.toLowerCase().includes(term))).slice(0, 5);
    setResults(localMatches);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=8&lang=en&lat=29.6186&lon=-95.5267`, { signal: controller.signal });
        const data:any = await res.json();
        const next = (data.features || []).filter((f:any)=>f.properties?.countrycode==="US" && (!/^\d/.test(value.trim()) || f.properties?.housenumber)).map((f: any) => {
          const p = f.properties || {};
          const parts = [p.name, [p.housenumber,p.street].filter(Boolean).join(" "), p.city, p.state, p.postcode].filter(Boolean);
          return { label: [...new Set(parts)].join(", "), lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
        });
        if (!controller.signal.aborted && next.length) setResults([...localMatches,...next.filter((p:Place)=>!localMatches.some(l=>l.label===p.label))].slice(0,8));
      } catch (err: any) { if (err?.name !== "AbortError" && !localMatches.length) setResults([]); }
      finally { setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, selected]);
  return <div className="address-control">
    <label htmlFor={id}>{label}</label>
    <div className="input-icon"><MapPin size={20} /><input id={id} required value={value} role="combobox" aria-autocomplete="list" aria-expanded={open && results.length > 0} aria-controls={`${id}-list`} aria-activedescendant={highlight >= 0 ? `${id}-opt-${highlight}` : undefined} enterKeyHint="search"
      onChange={(e) => { setSelected(false); setOpen(true); onChange(e.target.value); onPick(null); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setTimeout(() => setOpen(false), 150)}
      onKeyDown={(e) => {
        if (!open || results.length === 0) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => (h + 1) % results.length); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => (h <= 0 ? results.length - 1 : h - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); choose(results[highlight >= 0 ? highlight : 0]); }
        else if (e.key === "Escape") { setOpen(false); }
      }}
      placeholder={`Start typing your ${label.toLowerCase()}...`} autoComplete="off" />{busy && <Loader2 className="spin" size={18} />}</div>
    {!selected && value.trim().length >= 3 && !busy && results.length === 0 && <p className="address-help" role="status">No matching address yet. Add a street name or city, or call (346) 909-7822 for help.</p>}
    {open && results.length > 0 && <div className="suggestions" role="listbox" id={`${id}-list`}>{results.map((p, i) => <button type="button" role="option" id={`${id}-opt-${i}`} aria-selected={i === highlight} className={i === highlight ? "active" : undefined} key={`${p.lon}-${p.lat}-${i}`} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(p)}><MapPin size={16} /><span>{p.label}</span></button>)}</div>}
    {selected && <p className="selected-address">Selected: {value}</p>}
  </div>;
}


function AddressField(props: Parameters<typeof FallbackAddressField>[0]) { return <GoogleAddressField {...props} fallback={<FallbackAddressField {...props}/>}/>; }

export function QuoteForm({compact=false}:{compact?:boolean}){
 const [pickup,setPickup]=useState("");const [destination,setDestination]=useState("");
 const [a,setA]=useState<Place|null>(null),[b,setB]=useState<Place|null>(null);
 const [date,setDate]=useState(""),[time,setTime]=useState(""),[round,setRound]=useState(false);
 const [slots,setSlots]=useState<any[]>([]),[availabilityError,setAvailabilityError]=useState("");
 const [result,setResult]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{setTime("");setSlots([]);setAvailabilityError("");if(!date)return;const c=new AbortController();fetch(`/api/availability?date=${date}`,{signal:c.signal}).then(r=>r.json()).then((d:any)=>{if(d.error)setAvailabilityError(d.error);else setSlots(d.slots);}).catch(e=>{if(e.name!=="AbortError")setAvailabilityError("Calendar unavailable. Try another date or call us.");});return()=>c.abort();},[date]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setResult(null);setMessage("");const f=new FormData(e.currentTarget);try{if(!a||!b)throw new Error("Choose both addresses from the suggestions.");const r=await fetch("/api/quotes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:f.get("name"),email:f.get("email"),phone:f.get("phone"),service:f.get("service"),pickup:a,destination:b,date,time,returnTime:round?f.get("returnTime"):undefined,first:f.get("first")==="on",consent:f.get("consent")==="on",website:f.get("website"),key:typeof crypto.randomUUID==="function"?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&(15>>Number(c)/4)).toString(16))})});const d:any=await r.json();if(!r.ok)throw new Error(d.error);setResult(d);}catch(e){setError(e instanceof Error?e.message:"Unable to save. Try again.");}finally{setBusy(false);}}
 async function request(){setBusy(true);setError("");try{const r=await fetch("/api/quotes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:result.id})});const d:any=await r.json();if(!r.ok)throw new Error(d.error);setMessage(d.message);}catch(e){setError(e instanceof Error?e.message:"Please try again.");}finally{setBusy(false);}}
 return <div className={`quote-card ${compact?"compact":""}`} id="quote-form"><div className="offer-badge">20% OFF YOUR FIRST RIDE</div><div className="quote-heading"><h2>Your ride. Your estimate.</h2><p>Local or long distance. See your estimate and request a time in minutes.</p></div>
 <form onSubmit={submit} onChange={()=>{setResult(null);setMessage("");}}>
 <label className="select-label">Transportation<select name="service"><option value="wheelchair">Wheelchair transportation</option><option value="ambulatory">Ambulatory transportation</option></select></label>
 <AddressField label="Pickup Address" value={pickup} onChange={setPickup} onPick={setA}/><AddressField label="Destination Address" value={destination} onChange={setDestination} onPick={setB}/>
 <label className="check-field"><input type="checkbox" checked={round} onChange={e=>setRound(e.target.checked)}/> I need a round trip</label>
 <div className="form-grid"><label>Trip date<input required type="date" name="date" onBlur={e=>setDate(e.currentTarget.value)} onChange={e=>setDate(e.target.value)}/></label><label>Pickup time<select required value={time} onChange={e=>setTime(e.target.value)}><option value="">Choose a time</option>{slots.map(s=><option key={s.time} disabled={!s.available} value={s.time}>{s.time}{!s.available?" — unavailable":s.afterHours?" — after hours":""}</option>)}</select></label></div>
 <button type="button" className="secondary-button" onClick={e=>{const f=e.currentTarget.form;if(f)setDate(String(new FormData(f).get("date")||""));}}>Check availability</button>
 {availabilityError&&<p role="alert" className="form-error">{availabilityError}</p>}
 <p className="form-help">Houston time. Weekdays 5 a.m.–1:30 p.m.; weekends available. After-hours rides by request. We check the entire trip duration.</p>
 {round&&<label className="select-label">Return pickup time (same day)<input required type="time" name="returnTime"/></label>}
 <div className="form-grid"><label>Your name<input name="name" required autoComplete="name" maxLength={100}/></label><label>Phone<input name="phone" required type="tel" autoComplete="tel"/></label></div>
 <label className="select-label">Email<input name="email" type="email" required autoComplete="email"/></label>
 <label className="check-field"><input name="first" type="checkbox" defaultChecked/> This is my first ride with Medical Life Line</label>
 <label className="check-field"><input name="consent" type="checkbox" required/> Save my quote and contact me about this trip. <a href="/privacy">Privacy notice</a></label>
 <input name="website" className="bot-field" tabIndex={-1} autoComplete="off" aria-hidden="true"/>
 <button type="submit" className="quote-submit" disabled={busy||!time}>{busy?"Saving your estimate…":"See & Save My Estimate"}</button>
 </form>
 {error&&<p className="form-error" role="alert">{error}</p>}
 {result?.estimate.manual&&<div className="estimate-result" role="status"><h3>Trip request saved</h3><p>{result.message}</p><a className="secondary-button" href="tel:+13469097822">Call for Your Estimate</a></div>}
 {result&&!result.estimate.manual&&<div className="estimate-result" aria-live="polite"><h3>Your saved estimate</h3><p>{result.estimate.returnMiles==null?`${result.estimate.miles} passenger miles`:result.estimate.returnMiles===result.estimate.miles?`${result.estimate.miles} passenger miles each way`:`${result.estimate.miles} passenger miles out · ${result.estimate.returnMiles} back`}</p><div>Before discount <b>${result.estimate.subtotal.toFixed(2)}</b></div><div>First-ride savings <b>−${result.estimate.discount.toFixed(2)}</b></div><strong className="estimate-total">${result.estimate.total.toFixed(2)}</strong>{result.estimate.afterHours>0&&<p>Includes ${result.estimate.afterHours} in after-hours fees before discount.</p>}{result.estimate.longDistance&&<p>Long-distance estimate includes applicable empty-return travel. Exact routing, positioning, and availability require owner review.</p>}<p>Estimate only. Additional assistance, tolls or waiting will be discussed before confirmation. First-ride eligibility is verified before booking.</p>{message?<p role="status">{message}</p>:<button type="button" className="quote-submit" onClick={request} disabled={busy}>Request This Ride</button>}<a className="secondary-button" href="tel:+13469097822">Call (346) 909-7822</a></div>}
 <p className="form-help">Need recurring dialysis rides or an overnight return? <a href="tel:+13469097822">Call to arrange your schedule.</a></p></div>;
}
