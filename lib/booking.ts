import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export function database(){ if(!env.DB) throw new Error("Booking storage is unavailable. Please call (346) 909-7822."); return env.DB; }
export async function owner(){const u=await getChatGPTUser();return !!u && u.email.toLowerCase()==="vgcaldwell89@gmail.com";}
export function sameOrigin(r:Request){return r.headers.get("origin")===new URL(r.url).origin;}
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
export function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export function validDate(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s&&s>=today()&&s<=new Date(Date.now()+90*86400000).toISOString().slice(0,10);}
export function minutes(s:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))throw new Error("Choose a valid pickup time.");return Number(s.slice(0,2))*60+Number(s.slice(3));}
export function timeFee(m:number){return m<300||m>=1320?75:m>=1080?45:0;}
export function regularBlocked(date:string,start:number,end:number){const day=new Date(date+"T12:00:00Z").getUTCDay();return day>0&&day<6&&start<1080&&end>810;}
export async function busy(date:string){const d=database();const a=await d.prepare("SELECT start,end FROM availability_blocks WHERE date=? UNION ALL SELECT start,end FROM ride_requests WHERE date=? AND status='confirmed'").bind(date,date).all<{start:number,end:number}>();return a.results;}
export async function available(date:string,start:number,end:number){return end<=1440&&!regularBlocked(date,start,end)&&!(await busy(date)).some(x=>start<x.end&&end>x.start);}
export async function route(a:{lon:number,lat:number},b:{lon:number,lat:number}){
 let res:Response;try{res=await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`,{signal:AbortSignal.timeout(12000)});}catch{throw new Error("Route lookup is unavailable. Please try again or call us.");}
 if(!res.ok)throw new Error("Route lookup is unavailable. Please try again or call us.");
 const data:any=await res.json();const r=data.routes?.[0];if(!r||!Number.isFinite(r.distance)||r.distance<=0)throw new Error("We could not verify this route. Please choose different addresses or call us.");return {miles:r.distance/1609.344,minutes:Math.ceil(r.duration/60)};
}
export function price(miles:number,service:string,start:number,returnStart:number|null,first:boolean){
 const leg=(service==="ambulatory"?60:70)+Math.max(0,miles-10)*3.5;
 const fare=leg*(returnStart===null?1:2);const fees=timeFee(start)+(returnStart===null?0:timeFee(returnStart));
 // Long distance is a provisional route estimate; empty-return mileage applies only to one-way passenger journeys.
 const returnMileage=miles>=75&&returnStart===null?miles*1.5:0;
 const subtotal=Math.round((fare+fees+returnMileage)*100)/100;const discount=first?Math.round(subtotal*20)/100:0;
 return {subtotal,discount,total:Math.round((subtotal-discount)*100)/100,afterHours:fees,returnMileage:Math.round(returnMileage*100)/100,miles:Math.round(miles*10)/10,longDistance:miles>=75,firstRide:first,policy:"2026-09-28",reviewRequired:true};
}
