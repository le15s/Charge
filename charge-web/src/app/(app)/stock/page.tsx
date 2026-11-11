import StockManager from "@/components/StockManager";
import { PageHeader } from "@/components/SectionHeaders";
import { db } from "@/db";
import { stockItem } from "@/db/schema";
import { requireOnboarded } from "@/lib/session";
import { eq } from "drizzle-orm";

export const metadata = { title: "Stock" };

export default async function StockPage() {
  const { user } = await requireOnboarded();
  const rows = await db.select().from(stockItem).where(eq(stockItem.userId, user.id));
  const items = rows.map((r) => ({ ...r, quantityAt: r.quantityAt.getTime(), createdAt: undefined }));
  return (
    <div>
      <PageHeader title="Stock" tone="yellow">Keep track of your bars, whey and supplements. Charge works out when each one runs out, reminds you, and opens the shop page so reordering takes one tap.</PageHeader>
      <StockManager items={items} />
    </div>
  );
}
