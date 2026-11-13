import {test} from "node:test";
import assert from "node:assert/strict";
import {plannerAllowance} from "../src/server/planner-limits.ts";
test("per-client AI allowance resets after its time window",()=>{const now=Date.parse("2027-01-01T00:00:00Z");for(let i=0;i<12;i++)assert.equal(plannerAllowance("client-a",now),null);assert.match(plannerAllowance("client-a",now),/15 minutes/);assert.equal(plannerAllowance("client-a",now+900001),null);});
test("a process-wide daily cap applies across client identities",()=>{const old=process.env.AI_DAILY_REQUEST_LIMIT;process.env.AI_DAILY_REQUEST_LIMIT="2";const now=Date.parse("2027-01-02T00:00:00Z");try{assert.equal(plannerAllowance("client-b",now),null);assert.equal(plannerAllowance("client-c",now),null);assert.match(plannerAllowance("client-d",now),/daily/);assert.equal(plannerAllowance("client-d",now+86400000),null);}finally{if(old===undefined)delete process.env.AI_DAILY_REQUEST_LIMIT;else process.env.AI_DAILY_REQUEST_LIMIT=old;}});
