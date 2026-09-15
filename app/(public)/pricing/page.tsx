'use client'

import { Text, ToggleSwitch, PricingCard, FaqCard } from "@/components";
import { useState } from "react";

const faqs = [
  {
    question: "What is the difference between the Personal and Professional plans?",
    answer: "The Professional plan includes all the features of the Personal plan plus unlimited projects and unlimited members per team."
  },
  {
    question: "What is the difference between the Professional and Enterprise plans?",
    answer: "The Enterprise plan includes all the features of the Professional plan plus unlimited teams and unlimited members per team."
  },
  {
    question: "What is the difference between the Personal and Enterprise plans?",
    answer: "The Enterprise plan includes all the features of the Personal plan plus unlimited teams and unlimited members per team."
  },
  {
    question: "What is the difference between the Professional and Enterprise plans?",
    answer: "The Enterprise plan includes all the features of the Professional plan plus unlimited teams and unlimited members per team."
  },
  {
    question: "How much does it cost?",
    answer: "It depends on the plan you choose. For example, the Personal plan costs $200 per month, while the Professional plan costs $500 per month."
  }
];

export default function PricingPage() {

  const [isAnnual, setIsAnnual] = useState(true);

  return <div className="flex flex-col gap-20">
    
    <div className="flex flex-row justify-between items-center gap-10 flex-wrap">
      <span className="">
        <Text as="h1" size="headline" className="text-left">
          <b>Pick the plan that fits you!</b>
        </Text>
        <Text as="p" size="body" className="text-left">
          With any plan you will get a 14 days free trail, cancel any time
        </Text>
      </span>
      <span className="flex flex-row items-center gap-3 text-fg/90">
        <Text as="p" size="body">Monthly</Text>
        <ToggleSwitch checked={isAnnual} onChange={setIsAnnual} />
        <Text as="p" size="body" className="text-nowrap">Annually <small className="opacity-60">20% off!</small></Text>
      </span>
    </div>

    <div className="flex flex-row gap-5 flex-wrap justify-center">
      <PricingCard isAnnual={isAnnual} type="personal" />
      <PricingCard isAnnual={isAnnual} type="professional" />
      <PricingCard isAnnual={isAnnual} type="enterprise" />
    </div>

    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-10 flex-wrap">
      <span className="flex flex-col gap-1 flex-1">
        <Text as="b" size="headline">
          Frequently Asked Questions
        </Text>
        <Text as="p" size="body">
          Here are some answers for the questions that may be in your mind.
        </Text>
      </span>
      <div className="flex flex-col gap-4 flex-2">
        {
          faqs.map((faq, index) => <FaqCard key={index} question={faq.question} answer={faq.answer} />)
        }
      </div>
    </div>

  </div>;
}
