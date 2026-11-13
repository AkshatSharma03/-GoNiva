import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/planner/route.ts";
import { defaultSearch } from "../src/lib/travel/model.ts";
const request=(body)=>new Request("http://localhost/api/planner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const payload=()=>({messages:[{role:"user",content:"Tokyo for 4 nights under $900"}],search:defaultSearch()});
test("planner rejects malformed requests and invalid travel dates",async()=>{
 assert.equal((await POST(request({}))).status,400);
 assert.equal((await POST(request({...payload(),search:{...defaultSearch(),checkOut:"2020-01-01"}}))).status,400);
 assert.equal((await POST(new Request("http://localhost/api/planner",{method:"POST",body:"{"}))).status,400);
 assert.equal((await POST(new Request("http://localhost/api/planner",{method:"POST",body:"x".repeat(140001)}))).status,413);
});
test("planner operates without AI credentials",async()=>{
 const previous=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try {const res=await POST(request(payload()));const data=await res.json();assert.equal(res.status,200);assert.equal(data.mode,"local");assert.equal(data.search.cityCode,"TYO");}finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});
test("AI provider failures and refusals fall back to validated local planning",async()=>{
 const previous={key:process.env.OPENAI_API_KEY,fetch:globalThis.fetch};process.env.OPENAI_API_KEY="fake-test-key";
 try {for(const response of [()=>new Response("Unavailable",{status:503}),()=>Response.json({status:"completed",output:[{content:[{type:"refusal"}]}]})]){globalThis.fetch=async()=>response();const res=await POST(request(payload()));const data=await res.json();assert.equal(data.mode,"local");assert.equal(data.search.cityCode,"TYO");assert.match(data.warning,/unavailable/);}}finally{globalThis.fetch=previous.fetch;if(previous.key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous.key;}
});
test("AI preferences are validated and the API key stays in the server request",async()=>{
 const previous={key:process.env.OPENAI_API_KEY,fetch:globalThis.fetch};process.env.OPENAI_API_KEY="fake-test-key";
 try {globalThis.fetch=async(url,options)=>{assert.equal(url,"https://api.openai.com/v1/responses");assert.equal(options.headers.Authorization,"Bearer fake-test-key");const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);return Response.json({status:"completed",output:[{content:[{type:"output_text",text:JSON.stringify({reply:"A Tokyo escape sounds lovely.",...defaultSearch(),cityCode:"TYO",maxPrice:900,minRating:null})}]}]});};const res=await POST(request(payload()));const data=await res.json();assert.equal(data.mode,"ai");assert.equal(data.search.cityName,"Tokyo");assert.ok(!JSON.stringify(data).includes("fake-test-key"));}finally{globalThis.fetch=previous.fetch;if(previous.key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous.key;}
});
test("planner refuses card-number-shaped messages before invoking AI",async()=>{
 const res=await POST(request({...payload(),messages:[{role:"user",content:"My card number is 4111 1111 1111 1111"}]}));assert.equal(res.status,400);assert.match((await res.json()).error,/card numbers/);
});
