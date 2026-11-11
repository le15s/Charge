import { db } from "@/db";
import { progressPhoto } from "@/db/schema";
import { getSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Progress photos are private: only the signed-in owner can fetch them. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const size = new URL(req.url).searchParams.get("size") === "full" ? "full" : "thumb";
  const [row] = await db.select().from(progressPhoto).where(and(eq(progressPhoto.id, id), eq(progressPhoto.userId, session.user.id)));
  if (!row) return new Response("Not found", { status: 404 });
  const data = size === "full" ? row.full : row.thumb;
  const buf = Buffer.from(data.slice(data.indexOf(",") + 1), "base64");
  return new Response(buf, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}
