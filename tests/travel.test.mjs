import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultSearch, searchSchema, addDays, today, itinerary, bookingLink } from "../src/lib/travel/model.ts";
import { planLocally } from "../src/lib/travel/planner.ts";
import { sampleHotels, searchHotels } from "../src/server/hotels.ts";

test("reject invalid calendar dates, reversed dates, past trips, and oversized stays",()=>{
 const s=defaultSearch();
 for(const patch of [{checkIn:"2027-02-30"},{checkOut:s.checkIn},{checkIn:"2020-01-01"},{checkOut:addDays(s.checkIn,31)},{adults:0},{maxPrice:-5}]) assert.equal(searchSchema.safeParse({...s,...patch}).success,false);
 assert.equal(searchSchema.safeParse(s).success,true);
});
test("sample properties belong to the requested destination",()=>{
 const data=sampleHotels({...defaultSearch(),cityCode:"TYO",cityName:"Tokyo"});
 assert.equal(data.hotels.length,8);assert.ok(data.hotels.every(h=>h.name.includes("Tokyo")&&!h.address.includes("London")));
 assert.equal(data.source,"sample");
});
test("total budget excludes both expensive hotels and their offers",()=>{
 const data=sampleHotels({...defaultSearch(),maxPrice:400});
 assert.ok(data.hotels.length>0 && data.hotels.length<8);
 assert.ok(data.offers.every(o=>Number(o.price.total)<=400));
 assert.deepEqual(data.hotels.map(h=>h.hotelId),data.offers.map(o=>o.hotelId));
 assert.equal(sampleHotels({...defaultSearch(),maxPrice:1}).hotels.length,0);
});
test("rating and amenities are applied together",()=>{
 const data=sampleHotels({...defaultSearch(),minRating:5,amenities:["POOL","SPA"]});
 assert.equal(data.hotels.length,2);assert.ok(data.hotels.every(h=>Number(h.rating)>=5&&h.amenities.includes("POOL")&&h.amenities.includes("SPA")));
});
test("conversation changes destination, duration, guests, and budget",()=>{
 const result=planLocally("Paris for 4 nights under $900 with a pool and 3 guests",defaultSearch());
 assert.equal(result.search.cityCode,"PAR");assert.equal(result.search.cityName,"Paris");assert.equal(result.search.maxPrice,900);assert.equal(result.search.adults,3);assert.equal(result.search.checkOut,addDays(result.search.checkIn,4));assert.deepEqual(result.search.amenities,["POOL"]);
});
test("nightly budgets use the newly requested dates and duration",()=>{
 const result=planLocally("Tokyo for 4 nights under $200 per night",defaultSearch());
 assert.equal(result.search.maxPrice,800);
});
test("follow-up conversation preserves prior preferences and can remove amenities",()=>{
 const first=planLocally("Tokyo with a pool under $1500",defaultSearch());
 const second=planLocally("without the pool, with a spa",first.search);
 assert.equal(second.search.cityCode,"TYO");assert.equal(second.search.maxPrice,1500);assert.deepEqual(second.search.amenities,["SPA"]);
});
test("invalid conversational preferences do not overwrite a valid trip",()=>{
 const s=defaultSearch();const result=planLocally("London for 90 nights and 9 guests",s);
 assert.deepEqual(result.search,s);assert.match(result.reply,/1 and 30|6/);
});
test("itinerary produces an editable activity set for every travel day",()=>{
 const s=defaultSearch(),activities=itinerary(s);
 assert.equal(activities.length,9);assert.equal(new Set(activities.map(a=>a.id)).size,9);assert.deepEqual([...new Set(activities.map(a=>a.day))],[1,2,3]);
});
test("provider handoff contains dates, destination, and correct guest count",()=>{
 const search=defaultSearch(),hotel=sampleHotels(search).hotels[0];const link=new URL(bookingLink({hotel,search}));
 assert.equal(link.hostname,"www.booking.com");assert.equal(link.searchParams.get("checkin"),search.checkIn);assert.equal(link.searchParams.get("group_adults"),"2");assert.ok(link.searchParams.get("ss").includes("London"));
});
test("configured provider errors surface instead of substituting sample prices",async()=>{
 const previous={id:process.env.LITEAPI_API_KEY,secret:process.env.LITEAPI_ENV,fetch:globalThis.fetch};
 process.env.LITEAPI_API_KEY="sand_test";process.env.LITEAPI_ENV="sandbox";globalThis.fetch=async()=>new Response("Unavailable",{status:503});
 try{await assert.rejects(searchHotels(defaultSearch()),/temporarily unavailable/);}finally{globalThis.fetch=previous.fetch;for(const [key,value] of [["LITEAPI_API_KEY",previous.id],["LITEAPI_ENV",previous.secret]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
test("huge and malformed conversational dates cannot crash the basic planner",()=>{
 for(const text of ["2027-99-99 to 2027-12-12 for 4 nights",`Paris for ${"9".repeat(1000)} nights`]) {
  const result=planLocally(text,defaultSearch());assert.deepEqual(result.search,defaultSearch());
 }
});
