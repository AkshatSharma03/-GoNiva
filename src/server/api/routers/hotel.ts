import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { cities, searchSchema } from "~/lib/travel/model";
import { searchHotels } from "~/server/hotels";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
export const hotelRouter = createTRPCRouter({
  searchCities: publicProcedure
    .input(z.object({ keyword: z.string().max(100) }))
    .query(({ input }) => ({
      cities: cities
        .filter((c) =>
          `${c.name} ${c.country} ${c.cityCode}`
            .toLowerCase()
            .includes(input.keyword.toLowerCase()),
        )
        .slice(0, 10),
    })),
  searchHotels: publicProcedure.input(searchSchema).query(async ({ input }) => {
    try {
      return await searchHotels(input);
    } catch {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message:
          "We couldn’t reach the hotel provider. Please try again shortly.",
      });
    }
  }),
});
