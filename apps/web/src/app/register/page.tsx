import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export const metadata: Metadata = { title: 'Create Account' };

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { redirect } = await searchParams;
  const redirectTo =
    redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join SilaiKaam to get clothing measured and fitted to you."
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkHref="/login"
    >
      <RegisterForm redirectTo={redirectTo} />
    </AuthCard>
  );
}
