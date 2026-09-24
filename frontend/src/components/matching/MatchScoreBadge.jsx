import React from 'react';
import { Sparkles } from 'lucide-react';

export const MatchScoreBadge = ({ score, showIcon = true, size = 'md' }) => {
  const isHigh = score >= 90;
  const isMedium = score >= 80 && score < 90;

  const colorClass = isHigh
    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/30'
    : isMedium
    ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-500/30'
    : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-500/30';

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs font-mono font-medium ${colorClass} ${sizeClass}`}
    >
      {showIcon && <Sparkles className="w-3 h-3 text-emerald-500" />}
      <span>{score}% phù hợp</span>
    </div>
  );
};
