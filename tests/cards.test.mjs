import { test } from "node:test";
import assert from "node:assert/strict";
import { cardPrograms, detectCards, detectOwnedCards, estimateCardBenefit, minimumNights } from "../src/lib/travel/cards.ts";
const program=id=>cardPrograms.find(p=>p.id===id);
const input={nights:3,bookingDate:"2026-11-13",quote:800,remaining:500,eligible:true};
test("recognizes card products without conflating Preferred and Reserve",()=>{assert.deepEqual(detectCards("I have Amex Platinum and Chase Sapphire Preferred"),["amex-platinum","chase-preferred"]);assert.deepEqual(detectCards("A Visa card"),[]);});
test("The Edit caps a single reservation at $250 even with $500 remaining",()=>{assert.deepEqual(estimateCardBenefit(program("reserve-edit"),input),{credit:250,net:550});});
test("unknown eligibility and short stays do not produce credit estimates",()=>{assert.equal(estimateCardBenefit(program("reserve-edit"),{...input,eligible:false}),null);assert.equal(estimateCardBenefit(program("reserve-edit"),{...input,nights:1}),null);});
test("credits never exceed the quote or available balance",()=>{assert.deepEqual(estimateCardBenefit(program("venture-travel"),{...input,quote:100,remaining:300}),{credit:100,net:0});assert.deepEqual(estimateCardBenefit(program("reserve-travel"),{...input,remaining:50}),{credit:50,net:750});assert.equal(estimateCardBenefit(program("reserve-travel"),{...input,remaining:-1}),null);});
test("property-spend perks are never subtracted from hotel price",()=>{const result=estimateCardBenefit(program("venture-premier"),{...input,remaining:300});assert.equal(result.net,500);assert.equal(result.credit,300);});
test("Amex FHR credit stay minimum follows booking date, not travel date",()=>{assert.equal(minimumNights(program("amex-fhr"),"2026-12-31"),1);assert.equal(minimumNights(program("amex-fhr"),"2027-01-01"),2);assert.equal(minimumNights(program("amex-thc"),"2026-11-13"),2);});
test("alternative programs share a credit pool instead of inventing new balances",()=>{assert.equal(program("amex-fhr").pool,program("amex-thc").pool);assert.equal(program("venture-premier").pool,program("venture-travel").pool);});

test("only explicit ownership updates the wallet and business cards are not mapped to consumer benefits",()=>{assert.deepEqual(detectOwnedCards("I have Amex Platinum"),["amex-platinum"]);assert.deepEqual(detectOwnedCards("Should I get Amex Platinum?"),[]);assert.deepEqual(detectOwnedCards("I don’t have Amex Platinum"),[]);assert.deepEqual(detectCards("Amex Platinum Business"),[]);});
