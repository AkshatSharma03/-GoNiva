import {test} from "node:test";
import assert from "node:assert/strict";
import {parseTravelRoute,travelRouteHash} from "../src/lib/travel/navigation.ts";
test("a trip and its view survive URL serialization",()=>{for(const view of ["explore","saved","trips","cards"]){const route={view,tripId:"trip-123"};assert.deepEqual(parseTravelRoute(travelRouteHash(route)),route);}});
test("unknown routes and invalid trip identifiers have safe defaults",()=>{assert.deepEqual(parseTravelRoute(""),{view:"explore",tripId:null});assert.deepEqual(parseTravelRoute("#/unknown"),{view:"explore",tripId:null});assert.deepEqual(parseTravelRoute("#/trips?trip=%3Cscript%3E"),{view:"trips",tripId:null});assert.equal(parseTravelRoute("#/cards?trip="+"x".repeat(101)).tripId,null);});
test("the new-trip route drops the previous trip without losing its view",()=>{assert.equal(travelRouteHash({view:"explore",tripId:null}),"#/explore");assert.deepEqual(parseTravelRoute("#/saved"),{view:"saved",tripId:null});});
