import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "~/server/auth";
function configured() {
  return Boolean(
    process.env.AUTH_SECRET &&
      process.env.AUTH_DISCORD_ID &&
      process.env.AUTH_DISCORD_SECRET,
  );
}
export function GET(request: NextRequest) {
  return configured()
    ? handlers.GET(request)
    : NextResponse.json(
        {
          error:
            "Account sign-in is not configured. Your personal travel space works without sign-in.",
        },
        { status: 503 },
      );
}
export function POST(request: NextRequest) {
  return configured()
    ? handlers.POST(request)
    : NextResponse.json(
        { error: "Account sign-in is not configured." },
        { status: 503 },
      );
}
