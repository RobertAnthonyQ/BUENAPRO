import { redirect } from "next/navigation";
import { TrackingPage } from "@/features/tracking/TrackingPage";
import { currentTenantId } from "@/server/auth/tenant";

export default async function SeguimientoRoute() {
  const tenantId = await currentTenantId();
  if (!tenantId) redirect("/login");
  return <TrackingPage tenantId={tenantId} />;
}
