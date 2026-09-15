import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata: Metadata = { title: 'Log In' };

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; expired?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, expired } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to manage your fit profile and orders."
      footerText="New to SilaiKaam?"
      footerLinkText="Create an account"
      footerLinkHref="/register"
    >
      <LoginForm
        redirectTo={redirect ?? null}
        initialNotice={expired ? 'Your session has expired. Please log in again.' : undefined}
      />
    </AuthCard>
  );
}
