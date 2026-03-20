import { HeartPulse } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface via-white to-surface-container-low p-4">
      <div className="w-full max-w-[28rem]">
        <div className="mb-10 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container shadow-[0_10px_40px_rgba(0,32,69,0.15)]">
            <HeartPulse className="h-7 w-7 text-secondary-container" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-on-surface">
            HomeCare Connect
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            통합 의료 플랫폼
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
