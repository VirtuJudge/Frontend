import { Text, Button } from "@/components";
import Image from "next/image";
import PricingPage from "../pricing/page";
import ContactsPage from "../company/contacts/page";

export default function HomePage() {
  return <div className="flex flex-col gap-20">
    <Image
      src="/static-assets/frosted-hero-center.webp"
      alt="VirtuJudge hero image"
      width={3024}
      height={2458}
      loading="lazy"
      className="w-2/3 absolute right-0 border -z-10"
    />

    <span className="space-y-1 mt-40">
      <Text as="h1" size="hero">
        <b>Be the next one on stage!</b>
      </Text>
      <Text as="p" size="body">
        VirtuJudge is a platform that helps you to improve your presentation skills by providing a suite of AI-assisted tools. With our cutting-edge technology, we're able to analyze your performance, identify areas for improvement, and provide personalized feedback to help you become the best presenter you can be.
      </Text>
    </span>

    <div className="flex justify-center items-center bg-bg-light rounded-[2.5rem] w-full p-20 mb-80">
      <span className="flex flex-row gap-5 items-center">
        <Image
          src="/logos/logo-primary.webp"
          alt="VirtuJudge Logo"
          width={671}
          height={304}
          priority
          className="w-30 h-auto"
        />
        <Text as="p" size="body-large">
          <b>Alpha version is now available!</b>
          <small className="opacity-70"> v0.0.1a</small>
        </Text>
      </span>
    </div>

    <PricingPage />
    <ContactsPage />

  </div>;
}
