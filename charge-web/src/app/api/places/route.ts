import { limited, searchPlaces } from "@/lib/gyms";
import { requireOnboarded } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/places?q=lyon  ->  where that is, so the map can jump there. */
export async function GET(req: Request) {
  let userId: string;
  try { userId = (await requireOnboarded()).user.id; }
  catch { return NextResponse.json({ error: "auth" }, { status: 401 }); }
  if (limited(userId, 20)) return NextResponse.json({ error: "slow down" }, { status: 429 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try { return NextResponse.json({ places: await searchPlaces(q) }); }
  catch (e) { console.error("[places]", e); return NextResponse.json({ error: "Search is unavailable right now." }, { status: 502 }); }
}
