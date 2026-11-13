const windows = new Map<string, { count: number; start: number }>();
let daily = { day: "", count: 0 };
const windowMs = 15 * 60 * 1000;
// Railway currently runs one instance. For multiple replicas, replace this with a shared store.
export function plannerAllowance(
  identity: string,
  now = Date.now(),
): string | null {
  const day = new Date(now).toISOString().slice(0, 10);
  if (daily.day !== day) daily = { day, count: 0 };
  const dailyLimit = Number(process.env.AI_DAILY_REQUEST_LIMIT ?? 100);
  if (
    daily.count >=
    (Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : 100)
  )
    return "Niva’s daily AI allowance has been reached. Please try again tomorrow or use the search form.";
  for (const [key, value] of windows)
    if (now - value.start >= windowMs) windows.delete(key);
  const entry = windows.get(identity) ?? { count: 0, start: now };
  if (entry.count >= 12)
    return "You’ve sent several messages recently. Please try again in 15 minutes or use the search form.";
  if (windows.size >= 10000 && !windows.has(identity))
    return "Niva is busy. Please try again shortly.";
  entry.count++;
  windows.set(identity, entry);
  daily.count++;
  return null;
}
