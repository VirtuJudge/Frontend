import { Text } from "@/components";

const TERMS_AND_CONDITIONS = [
  {
    title: "Acceptance of Terms & Service Scope",
    body: "VirtuJudge provides automated pitch rehearsal, multi-modal evaluation, and simulated Q&A for informational and skill-building purposes.",
  },
  {
    title: "User Warranties & Participant Consent",
    body: "You represent and warrant that all individuals appearing in uploaded videos or providing audio answers have given explicit consent to be recorded and evaluated.",
  },
  {
    title: "Intellectual Property Ownership",
    body: "You own 100% of your pitch: VirtuJudge claims no ownership over your presentations, startup decks, ideas, trademarks, or generated reports.",
  },
  {
    title: "AI Output & Feedback Disclaimer",
    body: "VirtuJudge evaluations are generated via automated machine learning models based on standard presentation rubrics. Feedback does not constitute financial, legal, or investment advice, nor does it guarantee competition success or investor funding.",
  },
  {
    title: "Prohibited Activities",
    body: "Users may not upload malicious files, attempt prompt injections via documents, reverse-engineer model endTER, or bypass team-scoped authorization.",
  },
  {
    title: "Account Termination & Data Erasure",
    body: "Users may terminate accounts at any time, initiating permanent data purge as outlined in our Data Privacy Policy.",
  },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col gap-20">
      <Text as="h1" size="subheadline" className="text-primary">
        <b>Terms and conditions</b>
      </Text>

      <ol className="list-inside flex flex-col gap-6">
        {TERMS_AND_CONDITIONS.map((p, i) => (
          <Text as="li" size="body" key={p.title} className="text-left">
            <b>{`${i + 1}. ${p.title}:`}</b>
            <br />
            {p.body}
          </Text>
        ))}
      </ol>
    </div>
  );
}
