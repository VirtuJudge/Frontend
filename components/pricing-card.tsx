import { Button, Text, Wrapper, If } from "@/components";

export const ANNUAL_DISCOUNT = 0.2;

export const plans = {
  personal: {
    name: "Personal",
    description: "For individuals and small teams",
    monthly: 200,
    annual: 200 - 200 * ANNUAL_DISCOUNT,
    features: ["1 Team", "5 members per team", "5 Projects", "5 Hours/month"],
  },
  professional: {
    name: "Professional",
    description: "For professionals users and small businesses",
    monthly: 500,
    annual: 500 - 500 * ANNUAL_DISCOUNT,
    features: [
      "Unlimited teams",
      "Unlimited members per team",
      "Unlimited projects",
      "20 Hours/month",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations and enterprises",
    monthly: undefined,
    annual: undefined,
    features: ["All in Professional", "> 20 Hours/month"],
  },
};

export type PricingCardProps = {
  isAnnual: boolean;
  type: "personal" | "professional" | "enterprise";
};

export function PricingCard({ isAnnual, type }: PricingCardProps) {
  return (
    <Wrapper
      as="div"
      className={`
		w-88 h-100 flex flex-col justify-between hocus:-translate-y-2 transition-transform duration-500
		${type === "professional" && "border border-primary"}`}
    >
      <Text as="b" size="body-large" className="text-center">
        {plans[type].name}
      </Text>
      <ul className="list-disc list-inside text-left">
        {plans[type].features.map((feature, index) => (
          <Text as="li" size="body" key={index}>
            {feature}
          </Text>
        ))}
      </ul>
      <If condition={type !== "enterprise"}>
        <Wrapper
          as="div"
          className="flex flex-row justify-between items-center gap-5 p-3"
        >
          <Text as="p" size="body-large">
            <b className="text-primary">
              {isAnnual ? plans[type].annual : plans[type].monthly}EGP
            </b>
            <small className="text-fg/70">/month</small>
          </Text>
          <Wrapper as="span" className="px-2 py-1">
            <Text as="p" size="caption" className="text-fg/70 text-nowrap">
              {isAnnual ? "Billed annually" : "Billed monthly"}
            </Text>
          </Wrapper>
        </Wrapper>
      </If>
      <Button variant="primary" href="/me">
        {type === "personal" || "professional"
          ? "Go " + plans[type].name
          : "Contact Sales"}
      </Button>
    </Wrapper>
  );
}
