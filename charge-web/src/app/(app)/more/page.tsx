import { requireOnboarded } from "@/lib/session";
import { PageHeader } from "@/components/SectionHeaders";
import Link from "next/link";
import { FiActivity, FiBookOpen, FiChevronRight, FiClock, FiMapPin, FiSettings } from "react-icons/fi";

export const metadata = { title: "More" };

const ITEMS = [
  { href: "/body", label: "Body", text: "Weight, measurements and progress photos.", icon: FiActivity },
  { href: "/history", label: "History", text: "Every finished workout, with weights and reps.", icon: FiClock },
  { href: "/exercises", label: "Exercise library", text: "870+ exercises with photos and instructions.", icon: FiBookOpen },
  { href: "/gyms", label: "Gym finder", text: "Gyms, studios and outdoor spots near you, on a map.", icon: FiMapPin },
  { href: "/settings", label: "Settings", text: "Theme, units, sounds, profile and account.", icon: FiSettings },
];

export default async function More() {
  await requireOnboarded();
  return (
    <div>
      <PageHeader title="More" tone="steel" />
      <ul className="card divide-y divide-border overflow-hidden dark:divide-darkmode-border">
        {ITEMS.map(({ href, label, text, icon: Icon }) => (
          <li key={href}><Link href={href} className="flex items-center gap-4 p-5 transition duration-200 hover:bg-light active:scale-[0.99] dark:hover:bg-darkmode-light">
            <Icon className="shrink-0 text-2xl text-primary dark:text-darkmode-primary" /><span className="grow"><span className="block font-semibold text-text-dark dark:text-darkmode-text-dark">{label}</span><span className="text-sm">{text}</span></span><FiChevronRight className="text-text-light" />
          </Link></li>
        ))}
      </ul>
    </div>
  );
}
