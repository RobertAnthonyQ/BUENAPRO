import { AuthPage } from "@/features/auth/AuthPage";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthPage error={params.error} mode="register" />;
}
