"use client";

import { Text, Wrapper } from "@/components";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useState } from "react";

export type FaqCardProps = {
  question: string;
  answer: string;
};

export function FaqCard({ question, answer }: FaqCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 max-w-3xl">
      <Wrapper
        as="div"
        className="w-full p-5 flex flex-row items-center justify-between gap-5 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Text as="p" size="body" className="text-left">
          {question}
        </Text>
        <Wrapper
          as="div"
          className={`p-3 w-fit ${isOpen ? "rotate-180" : ""} transition-transform duration-300`}
        >
          <Icon icon="tabler:chevron-down-filled" className="text-body" />
        </Wrapper>
      </Wrapper>
      <motion.div
        className="overflow-hidden"
        initial={{ height: 0, opacity: 0 }}
        animate={
          isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <Wrapper
          variant="glass-dark"
          as="div"
          className="w-full p-10 flex flex-row items-center justify-between gap-5"
        >
          <Text as="p" size="body" className="text-fg-light">
            {answer}
          </Text>
        </Wrapper>
      </motion.div>
    </div>
  );
}
