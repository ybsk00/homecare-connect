import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-[var(--shadow-card)]',
        padding && 'p-7',
        className,
      )}
    >
      {children}
    </div>
  );
}
