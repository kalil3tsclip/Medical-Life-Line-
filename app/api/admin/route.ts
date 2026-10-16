import { z } from "zod";
import { database,getVehicle,minutes,owner,regularBlocked,reply,sameOrigin,saveVehicle,validDate,RATES } from "@/lib/booking";
import { holdDeadline } from "@/lib/time";
import { createDepositLink, squareConfigured } from "@/lib/square";

const hhmm=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const cents=(n:number)=>Math.round(n*100)/100;

export async function GET(){if(!await owner())return reply({error:"Owner sign-in required."},403);try{const d=database();return reply({
 rides:(await d.prepare("SELECT * FROM ride_requests ORDER BY created DESC LIMIT 1000").all()).results,
 blocks:(await d.prepare("SELECT * FROM availability_blocks ORDER BY date,start").all()).results,
 square:squareConfigured(),vehicle:await getVehicle()});}catch{return reply({error:"Records could not load. Try again."},503);}}

async function confirmIfFree(d:D1Database,id:string,status:string,payment:string,estimate:string,ride:{date:string,start:number,end:number}){
 const result=await d.prepare("UPDATE ride_requests SET status=?,payment=?,estimate=?,end=? WHERE id=? AND NOT EXISTS(SELECT 1 FROM ride_requests AS other WHERE other.id<>? AND other.date=? AND other.status='confirmed' AND other.start<? AND other.end>?) AND NOT EXISTS(SELECT 1 FROM availability_blocks WHERE date=? AND start<? AND end>?)").bind(status,payment,estimate,ride.end,id,id,ride.date,ride.end,ride.start,ride.date,ride.end,ride.start).run();
 if(!result.meta.changes)throw new Error("Another ride or block conflicts with this trip.");
}

export async function POST(r:Request){if(!sameOrigin(r)||!await owner())return reply({error:"Not authorized."},403);try{const b:any=await r.json(),d=database();
 if(b.action==="block"){const x=z.object({date:z.string(),start:z.number().int().min(0).max(1439),end:z.number().int().min(1).max(1440)}).parse(b);if(!validDate(x.date)||x.end<=x.start)throw new Error("Invalid block.");const result=await d.prepare("INSERT INTO availability_blocks(id,date,start,end) SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM ride_requests WHERE date=? AND status='confirmed' AND start<? AND end>?)").bind(crypto.randomUUID(),x.date,x.start,x.end,x.date,x.end,x.start).run();if(!result.meta.changes)throw new Error("A confirmed ride overlaps. Resolve the ride first.");return reply({ok:true});}
 if(b.action==="unblock"){const id=z.string().uuid().parse(b.id);await d.prepare("DELETE FROM availability_blocks WHERE id=?").bind(id).run();return reply({ok:true});}

 // Verified van limits (from the ramp label / conversion paperwork). Blank = unknown.
 if(b.action==="vehicle"){const n=z.number().positive().max(5000).nullable().optional();const x=z.object({rampLbs:n,securementLbs:n,usableWidthIn:n,doorHeightIn:n,source:z.string().trim().max(200).nullable().optional()}).parse(b);await saveVehicle(x);return reply({ok:true});}

 // Manual reminder checklist: record that the owner called/texted the rider.
 if(b.action==="reminded"){const id=z.string().uuid().parse(b.id);const ride=await d.prepare("SELECT estimate FROM ride_requests WHERE id=?").bind(id).first<{estimate:string}>();if(!ride)throw new Error("Ride not found.");await d.prepare("UPDATE ride_requests SET estimate=? WHERE id=?").bind(JSON.stringify({...JSON.parse(ride.estimate),remindedAt:new Date().toISOString()}),id).run();return reply({ok:true});}

 // Phone booking entered by the owner. Lands as "requested" on the same calendar as website requests.
 if(b.action==="manual"){const x=z.object({name:z.string().trim().min(2).max(100),phone:z.string().regex(/^[+() 0-9.-]{10,25}$/),email:z.union([z.literal(""),z.string().email().max(200)]).optional(),riderName:z.string().trim().max(100).optional(),
  service:z.enum(["wheelchair","ambulatory"]),pickup:z.string().trim().min(4).max(300),destination:z.string().trim().min(4).max(300),date:z.string(),time:hhmm,appointmentTime:z.union([z.literal(""),hhmm]).optional(),
  returnTime:z.union([z.literal(""),hhmm]).optional(),freeAt:hhmm,fare:z.number().positive().max(25000),notes:z.string().trim().max(500).optional()}).parse(b);
  if(!validDate(x.date))throw new Error("Choose a date within the next 90 days.");
  const phone=x.phone.replace(/\D/g,"").replace(/^1(?=\d{10}$)/,"");if(phone.length!==10)throw new Error("Enter a 10-digit US phone number.");
  const start=minutes(x.time),end=minutes(x.freeAt);if(end<=start)throw new Error("“Van free again” must be after the pickup time.");
  if(x.returnTime&&minutes(x.returnTime)<=start)throw new Error("Return pickup must be after the first pickup.");
  const round=!!x.returnTime;
  const details={pickup:x.pickup,destination:x.destination,service:x.service,time:x.time,appointmentTime:x.appointmentTime||null,round,returnPlan:round?"scheduled":null,returnTime:x.returnTime||null,riderName:x.riderName||null,bookedForSomeoneElse:!!x.riderName,steps:null,notes:x.notes||null,source:"phone"};
  const estimate={manual:false,ownerReviewed:true,phoneBooking:true,total:x.fare,subtotal:x.fare,fare:x.fare,discount:0,deposit:cents(x.fare*RATES.depositShare),miles:null,returnMiles:null,policy:RATES.policy,reviewRequired:false};
  const id=crypto.randomUUID();
  await d.prepare("INSERT INTO ride_requests(id,name,phone,email,date,start,end,details,estimate,status,payment,created) VALUES(?,?,?,?,?,?,?,?,?,'requested','unpaid',?)").bind(id,x.name,phone,x.email||"",x.date,start,end,JSON.stringify(details),JSON.stringify(estimate),new Date().toISOString()).run();
  return reply({ok:true,id});}

 // Create a Square payment link for the 50% deposit and hold the ride while it is unpaid.
 if(b.action==="deposit-link"){const id=z.string().uuid().parse(b.id);
  const ride=await d.prepare("SELECT * FROM ride_requests WHERE id=?").bind(id).first<any>();if(!ride)throw new Error("Ride not found.");
  const q=JSON.parse(ride.estimate);if(q.manual||!q.total)throw new Error("Enter the verified final fare first.");
  if(!["quoted","requested","held"].includes(ride.status))throw new Error("Deposit links are for rides that are not yet confirmed.");
  const deposit=q.deposit??cents(q.total*RATES.depositShare);
  const now=new Date().toISOString();
  const clash=await d.prepare("SELECT id FROM ride_requests WHERE id<>? AND date=? AND start<? AND end>? AND (status='confirmed' OR (status='held' AND json_extract(estimate,'$.holdUntil')>?)) UNION ALL SELECT id FROM availability_blocks WHERE date=? AND start<? AND end>?").bind(id,ride.date,ride.end,ride.start,now,ride.date,ride.end,ride.start).first();
  if(clash)throw new Error("This time overlaps a confirmed ride, another held ride, or a blocked time. Resolve that first.");
  const holdMinutes=b.holdMinutes===undefined?undefined:z.number().int().min(15).max(1440).parse(b.holdMinutes);
  const until=holdDeadline({now:Date.now(),date:ride.date,start:ride.start,holdMinutes});
  if(until===null)throw new Error("Pickup is too soon for an online deposit (holds must end at least 1 hour before pickup). Collect the deposit by phone or in person, then record it.");
  const holdUntil=new Date(until).toISOString();
  const link=await createDepositLink({rideId:id,amount:deposit,date:ride.date,name:ride.name,email:ride.email||undefined,phone:ride.phone});
  const next={...q,deposit,squareOrderId:link.orderId,squareLinkId:link.linkId,depositUrl:link.url,holdUntil};
  await d.prepare("UPDATE ride_requests SET status='held',estimate=? WHERE id=?").bind(JSON.stringify(next),id).run();
  return reply({ok:true,url:link.url,deposit,holdUntil});}

 // Status / payment update from a ride card.
 const x=z.object({id:z.string().uuid(),status:z.enum(["quoted","requested","held","confirmed","completed","canceled"]),payment:z.enum(["unpaid","deposit-paid","paid","refunded"]),verifiedTotal:z.number().positive().max(25000).optional(),verifiedEnd:z.string().optional()}).parse(b);
 const ride=await d.prepare("SELECT date,start,end,status,estimate FROM ride_requests WHERE id=?").bind(x.id).first<{date:string,start:number,end:number,status:string,estimate:string}>();if(!ride)throw new Error("Ride not found.");
 let estimate=ride.estimate;
 if(JSON.parse(estimate).manual&&x.verifiedTotal&&x.verifiedEnd){const end=minutes(x.verifiedEnd);if(end<=ride.start)throw new Error("The reviewed end time must be after pickup.");ride.end=end;estimate=JSON.stringify({...JSON.parse(estimate),manual:false,ownerReviewed:true,total:x.verifiedTotal,subtotal:x.verifiedTotal,fare:x.verifiedTotal,discount:0,deposit:cents(x.verifiedTotal*RATES.depositShare)});}
 if(x.status==="confirmed"&&JSON.parse(estimate).manual)throw new Error("Enter the verified final fare and full travel end time first.");
 if(x.status==="confirmed"&&(!validDate(ride.date)||regularBlocked(ride.date,ride.start,ride.end)||x.payment==="unpaid"))throw new Error("Confirmation requires a recorded deposit/payment and an available window.");
 if(x.status==="confirmed")await confirmIfFree(d,x.id,x.status,x.payment,estimate,ride);
 else await d.prepare("UPDATE ride_requests SET status=?,payment=?,estimate=?,end=? WHERE id=?").bind(x.status,x.payment,estimate,ride.end,x.id).run();
 return reply({ok:true});}catch(e){return reply({error:e instanceof z.ZodError?"Check the form: some details are missing or invalid.":e instanceof Error?e.message:"Unable to save changes."},400);}}
