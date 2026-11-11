import { AmbientPlates } from "@/components/Decor";
import Footer from "@/partials/Footer";
import Header from "@/partials/Header";
import { getSession } from "@/lib/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="app-backdrop flex min-h-screen flex-col">
      <AmbientPlates />
      <Header signedIn={!!session} />
      <main className="grow">{children}</main>
      <Footer />
    </div>
  );
}
