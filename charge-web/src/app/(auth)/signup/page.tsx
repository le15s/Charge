import AuthForm from "@/components/AuthForm";
import SeoMeta from "@/partials/SeoMeta";
import { googleEnabled } from "@/lib/auth";

export default function Page() {
  return (
    <>
      <SeoMeta title="Sign up" />
      <AuthForm mode="signup" googleEnabled={googleEnabled} />
    </>
  );
}
