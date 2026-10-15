import { z } from "zod";
import { available,database,minutes,price,reply,route,sameOrigin,today,validDate } from "@/lib/booking";
const place=z.object({label:z.string().min(4).max(300),lat:z.number().min(25).max(37),lon:z.number().min(-107).max(-93)});
const input=z.object({name:z.string().trim().min(2).max(100),phone:z.string().regex(/^[+() 0-9.-]{10,25}$/),email:z.string().email().max(200),pickup:place,destination:place,service:z.enum(["wheelchair","ambulatory"]),date:z.string(),time:z.string(),returnTime:z.string().optional(),first:z.boolean(),consent:z.literal(true),website:z.string().max(0),key:z.string().uuid()});
export async function POST(r:Request){if(!sameOrigin(r))return reply({error:"Please submit from our website."},403);try{
 const b=input.parse(await r.json());if(!validDate(b.date))throw new Error("Choose a date within the next 90 days.");
 const start=minutes(b.time),ret=b.returnTime?minutes(b.returnTime):null;
 if(b.date===today()){const t=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Chicago",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());if(start<=minutes(t))throw new Error("Please choose a future pickup time.");}
 const d=database();const phone=b.phone.replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"");if(phone.length!==10)throw new Error("Enter a 10-digit US phone number.");
 const recent=await d.prepare("SELECT COUNT(*) AS n FROM ride_requests WHERE phone=? AND created>?").bind(phone,new Date(Date.now()-3600000).toISOString()).first<{n:number}>();if((recent?.n||0)>=12)return reply({error:"Too many requests. Please call us for help."},429);
 let distance;try{distance=await route(b.pickup,b.destination);}catch{
 if(!await available(b.date,start,start+60))throw new Error("This pickup time is unavailable. Choose another time or call us.");
 const estimate={total:null,subtotal:null,discount:0,miles:null,manual:true,reviewRequired:true,firstRide:b.first};
 await d.prepare("INSERT INTO ride_requests(id,name,phone,email,date,start,end,details,estimate,status,payment,created) VALUES(?,?,?,?,?,?,?,?,?,'requested','unpaid',?)").bind(b.key,b.name,phone,b.email,b.date,start,start+60,JSON.stringify({pickup:b.pickup.label,destination:b.destination.label,service:b.service,time:b.time,returnTime:b.returnTime||null}),JSON.stringify(estimate),new Date().toISOString()).run();
 return reply({id:b.key,estimate,message:"Your trip request is saved. Route pricing is temporarily unavailable. Call (346) 909-7822 for your estimate. Your ride is not booked."});
 }
if(distance.miles>800)throw new Error("Please call us to plan this long-distance journey.");
 if(ret!==null&&ret<start+distance.minutes+30)throw new Error("Return pickup must allow time for the outbound ride and appointment.");
 const end=(ret??start)+distance.minutes*(ret===null?2:1)+45;
 if(!await available(b.date,start,end))throw new Error("This trip does not fit the available window, including loading and return travel. Choose another time or call us.");
 const prior=await d.prepare("SELECT id FROM ride_requests WHERE phone=? AND status='completed' LIMIT 1").bind(phone).first();
 // Each leg is priced on its own route. If the reverse lookup fails, fall back to the outbound distance.
 let returnMiles:number|null=null;if(ret!==null){try{returnMiles=(await route(b.destination,b.pickup)).miles;}catch{returnMiles=distance.miles;}}
 const estimate=price(distance.miles,b.service,start,ret,b.first&&!prior,returnMiles);
 await d.prepare("INSERT INTO ride_requests(id,name,phone,email,date,start,end,details,estimate,status,payment,created) VALUES(?,?,?,?,?,?,?,?,?,'quoted','unpaid',?)").bind(b.key,b.name,phone,b.email,b.date,start,end,JSON.stringify({pickup:b.pickup.label,destination:b.destination.label,service:b.service,time:b.time,returnTime:b.returnTime||null}),JSON.stringify(estimate),new Date().toISOString()).run();
 return reply({id:b.key,estimate,message:"Quote saved. Availability and first-ride eligibility require confirmation. No ride has been booked."});
 }catch(e){return reply({error:e instanceof z.ZodError?"Check your contact information and choose both suggested addresses.":e instanceof Error?e.message:"Unable to save your quote. Please try again."},400);}}
export async function PATCH(r:Request){if(!sameOrigin(r))return reply({error:"Invalid request."},403);try{const {id}=z.object({id:z.string().uuid()}).parse(await r.json());const d=database();const item=await d.prepare("SELECT date,start,end FROM ride_requests WHERE id=? AND status='quoted'").bind(id).first<{date:string,start:number,end:number}>();if(!item)return reply({error:"Request unavailable or already submitted."},409);if(!await available(item.date,item.start,item.end))return reply({error:"Availability changed. Please calculate a new quote."},409);await d.prepare("UPDATE ride_requests SET status='requested' WHERE id=? AND status='quoted'").bind(id).run();return reply({message:"Ride requested. Please call (346) 909-7822 to confirm availability and arrange your deposit. Your ride is not yet confirmed."});}catch{return reply({error:"Unable to request this ride. Please call us."},400);}}
