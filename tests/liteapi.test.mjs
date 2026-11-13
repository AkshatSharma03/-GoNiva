import { test } from "node:test";
import assert from "node:assert/strict";
import {
  searchLiteapiHotels,
  buildLiteapiSearch,
  hotelOccupancies,
} from "../src/server/liteapi.ts";
import {
  hotelIntegrationStatus,
  liteapiConfiguration,
} from "../src/server/liteapi-config.ts";
import { defaultSearch, searchSchema } from "../src/lib/travel/model.ts";
import { workspaceSchema } from "../src/lib/travel/storage.ts";
const search = () => ({
  ...defaultSearch(),
  cityCode: "PAR",
  cityName: "Paris",
  guestNationality: "IN",
});
const room = (fees = []) => ({
  adultCount: 2,
  name: "Double room",
  retailRate: { total: [{ amount: 100, currency: "USD" }], taxesAndFees: fees },
  cancellationPolicies: { refundableTag: "RFN" },
});
const quote = (patch = {}) => ({
  offerId: "quote",
  rateType: "standard",
  offerRetailRate: { amount: 100, currency: "USD" },
  suggestedSellingPrice: { amount: 110, currency: "USD" },
  rates: [room()],
  ...patch,
});
const payload = (quotes = [quote()], patch = {}) => ({
  sandbox: true,
  hotels: [
    {
      id: "hotel",
      name: "Paris Hotel",
      stars: 4,
      rating: 8.8,
      country_code: "FR",
      thumbnail: "https://example.com/photo.jpg",
    },
  ],
  data: [{ hotelId: "hotel", roomTypes: quotes }],
  ...patch,
});
async function run(
  body,
  { status = 200, mode = "sandbox", s = search(), capture } = {},
) {
  const prev = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    capture?.(url, options);
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
    });
  };
  try {
    return await searchLiteapiHotels(s, "sand_test", mode);
  } finally {
    globalThis.fetch = prev;
  }
}
test("provider request uses canonical destination, nationality, room occupancy and strict facilities", () => {
  const body = buildLiteapiSearch({
    ...search(),
    cityName: "spoof",
    adults: 5,
    minRating: 4,
    amenities: ["WIFI", "POOL"],
  });
  assert.equal(body.cityName, "Paris");
  assert.equal(body.countryCode, "FR");
  assert.equal(body.guestNationality, "IN");
  assert.deepEqual(body.occupancies, [
    { adults: 2 },
    { adults: 2 },
    { adults: 1 },
  ]);
  assert.deepEqual(body.starRating, [4, 4.5, 5]);
  assert.deepEqual(body.facilities, [107, 301]);
  assert.equal(body.strictFacilityFiltering, true);
  assert.deepEqual(hotelOccupancies(1), [{ adults: 1 }]);
});
test("rates request keeps key server-side and maps actual metadata, not guest score as stars", async () => {
  const data = await run(payload(), {
    capture: (url, options) => {
      assert.equal(url, "https://api.liteapi.travel/v3.0/hotels/rates");
      assert.equal(options.headers["X-API-Key"], "sand_test");
      assert.equal(options.cache, "no-store");
      assert.equal(JSON.parse(options.body).includeHotelData, true);
    },
  });
  assert.equal(data.hotels[0].rating, "4");
  assert.equal(data.hotels[0].imageUrl, "https://example.com/photo.jpg");
  assert.equal(data.offers[0].price.total, "110.00");
  assert.equal(data.offers[0].isEstimate, true);
  assert.equal(data.source, "sandbox");
});
test("SSP respects public floor without double-counting reported property charges", async () => {
  const fee = {
    included: false,
    amount: 20,
    currency: "USD",
    description: "City tax",
  };
  for (const [floor, total] of [
    [150, "150.00"],
    [110, "120.00"],
  ]) {
    const d = await run(
      payload([
        quote({
          suggestedSellingPrice: [{ amount: floor, currency: "USD" }],
          rates: [room([fee, { ...fee, included: true, amount: 40 }])],
        }),
      ]),
    );
    assert.equal(d.offers[0].price.total, total);
    assert.equal(d.offers[0].payAtProperty.length, 1);
  }
});
test("foreign property fees remain explicit and cannot pass a USD budget", async () => {
  const p = payload([
    quote({
      rates: [
        room([
          {
            included: false,
            amount: 5,
            currency: "EUR",
            description: "Local tax",
          },
        ]),
      ],
    }),
  ]);
  assert.equal((await run(p)).offers[0].additionalFees[0].currency, "EUR");
  assert.equal(
    (await run(p, { s: { ...search(), maxPrice: 500 } })).offers.length,
    0,
  );
});
test("multi-room aggregate price is not multiplied by nights or guests", async () => {
  const d = await run(
    payload([
      quote({
        rates: [room(), room(), { ...room(), adultCount: 1 }],
        offerRetailRate: { amount: 300, currency: "USD" },
        suggestedSellingPrice: null,
      }),
    ]),
    { s: { ...search(), adults: 5 } },
  );
  assert.equal(d.offers[0].price.total, "300.00");
  assert.match(d.offers[0].room.description, /3 rooms/);
  assert.equal(
    (await run(payload(), { s: { ...search(), adults: 5 } })).offers.length,
    0,
  );
});
test("live skips package and loyalty-only prices while sandbox labels test inventory", async () => {
  const q = [
    quote({ offerId: "package", rateType: "package" }),
    quote({ offerId: "loyalty", loyaltyMembershipIdRequired: true }),
    quote({
      offerId: "public",
      offerRetailRate: { amount: 120, currency: "USD" },
    }),
  ];
  assert.equal(
    (await run(payload(q, { sandbox: false }), { mode: "live" })).offers[0]
      .offerId,
    "public",
  );
  assert.equal((await run(payload([q[0]]))).offers.length, 1);
});
test("no availability is empty; provider failures and environment mismatch stay errors", async () => {
  assert.equal((await run(null, { status: 204 })).hotels.length, 0);
  assert.equal((await run({ error: { code: 2001 } })).hotels.length, 0);
  for (const status of [401, 403, 429, 503])
    await assert.rejects(run({}, { status }));
  for (const body of [
    { error: { code: 4000 } },
    {},
    { data: "invalid" },
    payload(undefined, { sandbox: false }),
  ])
    await assert.rejects(run(body));
});
test("unsafe property photos are discarded", async () => {
  const p = payload();
  p.hotels[0].thumbnail = "javascript:alert(1)";
  assert.equal((await run(p)).hotels[0].imageUrl, undefined);
});
test("key/environment mismatch fails closed; absent key remains sample mode", () => {
  const prior = {
    key: process.env.LITEAPI_API_KEY,
    env: process.env.LITEAPI_ENV,
  };
  try {
    delete process.env.LITEAPI_API_KEY;
    assert.equal(hotelIntegrationStatus(), "sample");
    process.env.LITEAPI_API_KEY = "prod_test";
    process.env.LITEAPI_ENV = "sandbox";
    assert.throws(liteapiConfiguration);
    process.env.LITEAPI_ENV = "production";
    assert.equal(hotelIntegrationStatus(), "live");
  } finally {
    for (const [k, v] of [
      ["LITEAPI_API_KEY", prior.key],
      ["LITEAPI_ENV", prior.env],
    ])
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
  }
});
test("nationality defaults on old searches and validates ISO codes", () => {
  const s = defaultSearch();
  delete s.guestNationality;
  assert.equal(searchSchema.parse(s).guestNationality, "US");
  assert.equal(
    searchSchema.safeParse({ ...s, guestNationality: "ZZ" }).success,
    false,
  );
});
test("saved sandbox provenance and fee/photo metadata survive backup restore", async () => {
  const d = await run(payload());
  const saved = {
    id: "saved",
    hotel: d.hotels[0],
    offer: d.offers[0],
    search: search(),
    source: d.source,
    provider: d.provider,
    isMock: false,
    savedAt: new Date().toISOString(),
  };
  const w = workspaceSchema.parse({
    version: 1,
    trips: [],
    saved: [saved],
    folders: [],
  });
  assert.equal(w.saved[0].source, "sandbox");
  assert.equal(w.saved[0].hotel.imageUrl, saved.hotel.imageUrl);
  assert.equal(w.saved[0].offer.isEstimate, true);
  delete saved.source;
  delete saved.provider;
  delete saved.search.guestNationality;
  assert.equal(
    workspaceSchema.parse({ ...w, saved: [saved] }).saved[0].search
      .guestNationality,
    "US",
  );
});
