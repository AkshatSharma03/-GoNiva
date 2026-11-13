export class HotelProviderError extends Error {
  constructor(
    public readonly kind:
      | "configuration"
      | "authentication"
      | "rate_limit"
      | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "HotelProviderError";
  }
}
export function hotelIntegrationStatus() {
  const key = process.env.LITEAPI_API_KEY?.trim();
  if (!key) return "sample" as const;
  const mode = process.env.LITEAPI_ENV ?? "sandbox";
  if (mode !== "sandbox" && mode !== "production")
    return "misconfigured" as const;
  if (mode === "sandbox" && !/^(sand_|sandbox_)/.test(key))
    return "misconfigured" as const;
  if (mode === "production" && !key.startsWith("prod_"))
    return "misconfigured" as const;
  return mode === "sandbox" ? ("sandbox" as const) : ("live" as const);
}
export function liteapiConfiguration() {
  const mode = hotelIntegrationStatus();
  if (mode === "misconfigured")
    throw new HotelProviderError(
      "configuration",
      "Hotel search is not configured correctly. The API key and hotel environment must match.",
    );
  return { mode, key: process.env.LITEAPI_API_KEY?.trim() };
}
