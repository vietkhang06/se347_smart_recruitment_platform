import React from 'react';
import { Check, X, Award, Briefcase, Zap } from 'lucide-react';

export const MatchBreakdown = ({ breakdown }) => {
  if (!breakdown) return null;

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-emerald-500" />
        Chi tiết phân tích độ phù hợp AI
      </h4>

      {/* Skills Match */}
      {breakdown.skills && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-600 dark:text-slate-300">
              Kỹ năng chuyên môn
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {breakdown.skills.score}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${breakdown.skills.score}%` }}
            />
          </div>
          {breakdown.skills.matched && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {breakdown.skills.matched.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                >
                  <Check className="w-3 h-3" />
                  {s}
                </span>
              ))}
              {breakdown.skills.missing?.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  <X className="w-3 h-3 text-slate-400" />
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Experience */}
      {breakdown.experience && (
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium">Kinh nghiệm:</span>
            <span>{breakdown.experience.details}</span>
          </div>
        </div>
      )}

      {/* Cultural */}
      {breakdown.cultural && (
        <div className="pt-1">
          <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium">Văn hóa & Tiềm năng:</span>
            <span>{breakdown.cultural.details}</span>
          </div>
        </div>
      )}
    </div>
  );
};
