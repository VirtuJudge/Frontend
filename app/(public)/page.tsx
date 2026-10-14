import type { Metadata } from "next";
import { HomeIntro } from "@/components";
import PricingPage from "./pricing/page";
import ContactsPage from "./company/contact-us/page";

export const metadata: Metadata = {
  title: "Home",
  description:
    "AI-assisted pitch analysis, rehearsal, and evaluation platform.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col gap-20">
      <HomeIntro />
      <PricingPage />
      <ContactsPage />
    </div>
  );
}
