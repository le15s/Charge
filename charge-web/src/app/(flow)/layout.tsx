import { AmbientPlates } from "@/components/Decor";
import Logo from "@/components/Logo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { requireUser } from "@/lib/session";

export default async function FlowLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="app-backdrop flex min-h-screen flex-col">
      <AmbientPlates />
      <header className="container flex items-center justify-between py-5">
        <Logo />
        <ThemeSwitcher />
      </header>
      <main className="container flex grow justify-center pb-16 pt-2">{children}</main>
    </div>
  );
}
