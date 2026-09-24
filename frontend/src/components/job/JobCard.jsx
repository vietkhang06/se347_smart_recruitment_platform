import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { MatchScoreBadge } from '../matching/MatchScoreBadge';
import { Heart, MapPin, Clock, DollarSign, Building2 } from 'lucide-react';

export const JobCard = ({
  job,
  onApply,
  onSave,
  isSaved = false,
  compact = false,
}) => {
  return (
    <Card className="flex flex-col justify-between group">
      <div>
        {/* Top Header: Logo, Title, Save */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              {job.logo || 'MJ'}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                {job.company}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSave && onSave(job.id)}
            className={`p-2 rounded-xl transition-all ${
              isSaved
                ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isSaved ? 'Bỏ lưu' : 'Lưu tin'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Tags / Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-3.5 h-3.5 -mr-1" />
            {job.salary}
          </span>
          <MatchScoreBadge score={job.match} />
        </div>

        {/* Metadata info */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {job.type}
          </span>
          <span>{job.exp}</span>
        </div>

        {/* Description Snippet */}
        {job.description && !compact && (
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{job.posted}</span>
        <Button size="sm" onClick={() => onApply && onApply(job)}>
          Ứng tuyển ngay
        </Button>
      </div>
    </Card>
  );
};
