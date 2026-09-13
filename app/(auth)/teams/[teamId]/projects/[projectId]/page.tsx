import { redirect } from "next/navigation";

export default async function TeamProjectRedirectPage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}`);
}
