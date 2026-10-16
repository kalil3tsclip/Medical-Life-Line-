import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export { price, quote, timeFee, RATES } from "@/lib/pricing";
export function database(){ if(!env.DB) throw new Error("Booking storage is unavailable. Please call (346) 909-7822."); return env.DB; }
export async function owner(){const u=await getChatGPTUser();return !!u && u.email.toLowerCase()==="vgcaldwell89@gmail.com";}
export function sameOrigin(r:Request){return r.headers.get("origin")===new URL(r.url).origin;}
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
export function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s&&s>=today()&&s<=new Date(Date.now()+90*86400000).toISOString().slice(0,10);}
export function minutes(s:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))throw new Error("Choose a valid pickup time.");return Number(s.slice(0,2))*60+Number(s.slice(3));}
export function regularBlocked(date:string,start:number,end:number){const day=new Date(date+"T12:00:00Z").getUTCDay();return day>0&&day<6&&start<1080&&end>810;}
export async function busy(date:string){const d=database();const a=await d.prepare("SELECT start,end FROM availability_blocks WHERE date=? UNION ALL SELECT start,end FROM ride_requests WHERE date=? AND (status='confirmed' OR (status='held' AND json_extract(estimate,'$.holdUntil')>?))").bind(date,date,new Date().toISOString()).all<{start:number,end:number}>();return a.results;}
export async function available(date:string,start:number,end:number){return end<=1440&&!regularBlocked(date,start,end)&&!(await busy(date)).some(x=>start<x.end&&end>x.start);}
export async function route(a:{lon:number,lat:number},b:{lon:number,lat:number}){
 let res:Response;try{res=await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,{signal:AbortSignal.timeout(12000)});}catch{throw new Error("Route lookup is unavailable. Please try again or call us.");}
 if(!res.ok)throw new Error("Route lookup is unavailable. Please try again or call us.");
 const data:any=await res.json();const r=data.routes?.[0];if(!r||!Number.isFinite(r.distance)||r.distance<=0)throw new Error("We could not verify this route. Please choose different addresses or call us.");return {miles:r.distance/1609.344,minutes:Math.ceil(r.duration/60)};
}
// Owner settings (vehicle limits). The table creates itself on first use, so no migration is needed.
export type Vehicle={rampLbs?:number|null,securementLbs?:number|null,usableWidthIn?:number|null,doorHeightIn?:number|null,source?:string|null,updated?:string|null};
async function settingsTable(){await database().prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)").run();}
export async function getVehicle():Promise<Vehicle>{await settingsTable();const row=await database().prepare("SELECT value FROM settings WHERE key='vehicle'").first<{value:string}>();try{return row?JSON.parse(row.value):{};}catch{return {};}}
export async function saveVehicle(v:Vehicle){await settingsTable();await database().prepare("INSERT INTO settings(key,value) VALUES('vehicle',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({...v,updated:new Date().toISOString()})).run();}
