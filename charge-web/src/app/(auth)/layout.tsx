import { AmbientPlates } from "@/components/Decor";
import Logo from "@/components/Logo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect("/dashboard");
  return (
    <div className="app-backdrop flex min-h-screen flex-col">
      <AmbientPlates />
      <header className="container flex items-center justify-between py-5">
        <Logo />
        <ThemeSwitcher />
      </header>
      <main className="container flex grow items-start justify-center pb-16 pt-2 sm:items-center sm:pt-6">{children}</main>
    </div>
  );
}
