import React from 'react';
import { MatchScoreBadge } from '../matching/MatchScoreBadge';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export const CandidateRow = ({ candidate, onView }) => {
  return (
    <div className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
          {candidate.initials || 'AK'}
        </div>
        <div>
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
            {candidate.name}
          </h4>
          <p className="text-xs text-slate-500">
            {candidate.role} · {candidate.experience}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge>{candidate.stage}</Badge>
        <MatchScoreBadge score={candidate.match} size="sm" />
        {onView && (
          <Button variant="ghost" size="sm" onClick={() => onView(candidate)}>
            Xem
          </Button>
        )}
      </div>
    </div>
  );
};
