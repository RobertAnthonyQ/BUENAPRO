import { redirect } from "next/navigation";
import { ApplicationWorkspace } from "@/features/application-workspace";
import { currentTenantId } from "@/server/auth/tenant";

export default async function ApplicationRoute({ params }: { params: Promise<{ matchId: string }> }) {
  const tenantId = await currentTenantId();
  if (!tenantId) redirect("/login");
  const { matchId } = await params;
  return <ApplicationWorkspace matchId={matchId} />;
}
