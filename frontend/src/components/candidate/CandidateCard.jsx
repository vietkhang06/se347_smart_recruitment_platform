import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { MatchScoreBadge } from '../matching/MatchScoreBadge';
import { MapPin, Briefcase, Mail, Phone } from 'lucide-react';

export const CandidateCard = ({
  candidate,
  onView,
  onInvite,
  onSave,
}) => {
  return (
    <Card className="flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              {candidate.initials || 'UV'}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                {candidate.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {candidate.role}
              </p>
            </div>
          </div>
          <MatchScoreBadge score={candidate.match} size="sm" />
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            {candidate.experience}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {candidate.location}
          </span>
          <Badge>{candidate.stage}</Badge>
        </div>

        {/* Skills Tag Row */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {candidate.skills?.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView && onView(candidate)}
          className="w-full"
        >
          Xem hồ sơ
        </Button>
        <Button
          size="sm"
          onClick={() => onInvite && onInvite(candidate)}
          className="w-full"
        >
          Mời phỏng vấn
        </Button>
      </div>
    </Card>
  );
};
