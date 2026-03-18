import { clsx } from 'clsx';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function Loading({
  size = 'md',
  text = '불러오는 중...',
  fullPage = false,
}: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={clsx(
          'animate-spin rounded-full bg-gradient-to-r from-primary to-secondary',
          sizeMap[size]
        )}
        style={{
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 0)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 0)',
        }}
      />
      {text && <p className="text-sm text-on-surface-variant">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-14">{content}</div>;
}
