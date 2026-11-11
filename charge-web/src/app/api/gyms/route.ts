import { gymsAround, gymsInBox, limited, MAX_RADIUS } from "@/lib/gyms";
import { requireOnboarded } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const num = (v: string | null) => (v == null || v === "" ? NaN : Number(v));

/**
 * GET /api/gyms?lat=&lon=&r=          everything within r metres (max 10 km), nearest first
 * GET /api/gyms?s=&w=&n=&e=&lat=&lon=  explore: what is inside the visible map box
 */
export async function GET(req: Request) {
  let userId: string;
  try { userId = (await requireOnboarded()).user.id; }
  catch { return NextResponse.json({ error: "auth" }, { status: 401 }); }
  if (limited(userId)) return NextResponse.json({ error: "slow down" }, { status: 429 });

  const p = new URL(req.url).searchParams;
  const lat = num(p.get("lat")), lon = num(p.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return NextResponse.json({ error: "bad position" }, { status: 400 });

  try {
    if (p.has("s")) {
      const b = { s: num(p.get("s")), w: num(p.get("w")), n: num(p.get("n")), e: num(p.get("e")) };
      if (![b.s, b.w, b.n, b.e].every(isFinite) || b.s >= b.n || b.w >= b.e || Math.abs(b.s) > 90 || Math.abs(b.n) > 90) return NextResponse.json({ error: "bad box" }, { status: 400 });
      const { gyms, tooBig } = await gymsInBox(b, lat, lon);
      return NextResponse.json({ gyms, tooBig });
    }
    const r = Math.min(MAX_RADIUS, Math.max(500, num(p.get("r")) || MAX_RADIUS));
    return NextResponse.json({ gyms: await gymsAround(lat, lon, r), radius: r });
  } catch (e) {
    console.error("[gyms]", e);
    return NextResponse.json({ error: "The map data service is busy. Try again in a moment." }, { status: 502 });
  }
}
