'use client';

import { BookOpen, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

interface RagSource {
  id: string;
  category?: string;
  source: string;
  sourceType?: string;
  similarity?: number;
}

interface SourceCitationProps {
  sources: RagSource[];
  className?: string;
}

const sourceTypeLabels: Record<string, string> = {
  pubmed: 'PubMed',
  guideline: '임상 가이드라인',
  manual: '안내 자료',
};

export function SourceCitation({ sources, className }: SourceCitationProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={clsx('mt-3 rounded-xl bg-surface-container-low/50 p-3', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <BookOpen className="h-3 w-3 text-on-surface-variant/50" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
          참고 자료
        </span>
      </div>
      <div className="space-y-1.5">
        {sources.map((src, idx) => (
          <div
            key={src.id ?? idx}
            className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <span className="flex items-center gap-2">
              <span className="rounded bg-secondary/8 px-1.5 py-0.5 text-[9px] font-bold uppercase text-secondary">
                {sourceTypeLabels[src.sourceType ?? ''] ?? src.sourceType ?? '자료'}
              </span>
              <span className="font-medium">{src.source}</span>
            </span>
            {src.similarity != null && (
              <span className="text-[9px] font-medium text-on-surface-variant/40">
                {Math.round(src.similarity * 100)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
