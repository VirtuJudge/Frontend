import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the VirtuJudge team for inquiries, product support, or partnerships.",
  alternates: {
    canonical: "/company/contact-us",
  },
  openGraph: {
    title: "Contact Us | VirtuJudge",
    description:
      "Get in touch with the VirtuJudge team for inquiries, product support, partnerships, or enterprise pitch coaching demos.",
    url: "https://virtujudge.dev/company/contact-us",
  },
};

export default function ContactUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
