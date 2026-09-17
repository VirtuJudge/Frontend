import { Text } from "@/components";

const DATA_PRIVACY = [
  {
    title: "Private by Default",
    body:
      "All sessions, recordings, and pitch documents belong exclusively to your team.",
  },
  {
    title: "Zero Model Training",
    body:
      "Customer presentations and supporting documents are never used to train, fine-tune, or improve third party or internal AI models.",
  },
  {
    title: "Explicit Consent",
    body:
      "Every presenter must confirm recording and landmark analysis consent prior to session initialization.",
  },
  {
    title: "No Bio-metric Profiling",
    body:
      "Media Pipe and speech analytics are restricted to physical delivery observations (e.g. gaze direction, pause timing) and strictly avoid psychological or emotional classification.",
  },
];

export default function DataPrivacyPage() {
  return (
    <div className="flex flex-col gap-20">
      <Text as="h1" size="subheadline" className="text-primary text-center">
        <b>Your Data Privacy</b>
      </Text>

      <ol className="flex flex-col gap-6">
        {DATA_PRIVACY.map((p, i) => (
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
