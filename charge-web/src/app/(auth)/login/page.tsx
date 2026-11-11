import AuthForm from "@/components/AuthForm";
import SeoMeta from "@/partials/SeoMeta";
import { googleEnabled } from "@/lib/auth";

export default function Page() {
  return (
    <>
      <SeoMeta title="Log in" />
      <AuthForm mode="login" googleEnabled={googleEnabled} />
    </>
  );
}
