'use client'

import { Button, Input, Text } from "@/components";
import Image from "next/image";

export default function ContactsPage() {

  return <div className="flex flex-col gap-20">
    <Image
      src="/static-assets/frosted-hero-r.webp"
      alt="VirtuJudge hero image"
      width={1550}
      height={2728}
      loading="lazy"
      className="absolute right-0 w-1/3 hidden lg:block"
    />

    <div className="flex flex-col gap-20">
      <span>
        <Text as="h1" size="subheadline">
          <b>Contact Us</b>
        </Text>
        <Text as="p" size="body">
          If you have any questions or feedback, please contact us at
          <br />
          <a href="mailto:support@virtujudge.com" className="text-primary">support@virtujudge.com</a>
        </Text>
      </span>
      <form className="flex flex-col gap-5 w-full lg:w-1/2">
        <Input
          label="Name"
          type="text"
          className="w-full"
        />
        <Input
          label="email"
          type="email"
          className="w-full"
        />
        <Input
          label="Phone"
          type="tel"
          className="w-full"
        />
        <Input
          label="Message"
          className="w-full"
        />
        <Button variant="primary" className="w-full mt-10">
          Send Message
        </Button>
      </form>
    </div>

  </div>

}
