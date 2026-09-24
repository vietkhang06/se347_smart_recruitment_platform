import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { MatchScoreBadge } from '../../components/matching/MatchScoreBadge';
import { screeningService } from '../../services/screeningService';
import { candidateService } from '../../services/candidateService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import {
  GitPullRequest,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  MoreVertical,
  User,
} from 'lucide-react';

export const HRScreening = () => {
  const { toast, triggerToast } = useToast();
  const stages = screeningService.getPipelineStages();
  const [candidates, setCandidates] = useState(() =>
    candidateService.getCandidates()
  );

  const handleMoveStage = (candidateId, nextStage) => {
    const updated = candidates.map((c) =>
      c.id === candidateId ? { ...c, stage: nextStage } : c
    );
    setCandidates(updated);
    triggerToast(`Đã chuyển ứng viên sang vòng "${nextStage}"`, 'success');
  };

  const handleQuickScreen = (candidate) => {
    const res = screeningService.quickScreen(candidate);
    triggerToast(
      `Đề xuất MatchAI cho ${candidate.name}: ${res.recommendation} (${res.confidence})`,
      res.passed ? 'success' : 'neutral'
    );
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Quy trình & Sàng lọc hồ sơ ứng viên
        </h1>
        <p className="text-xs text-slate-500">
          Quản lý tiến trình ứng viên qua từng vòng đánh giá, bài test năng lực và phỏng vấn.
        </p>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage.id);
          return (
            <div
              key={stage.id}
              className="bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 space-y-3 min-w-[220px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {stage.label}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs">
                  {stageCandidates.length}
                </span>
              </div>

              {/* Cards in column */}
              <div className="space-y-2.5 min-h-[120px]">
                {stageCandidates.map((candidate) => (
                  <Card
                    key={candidate.id}
                    className="p-3.5 space-y-2.5 bg-white dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/60 shadow-xs hover:border-emerald-500/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {candidate.initials}
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white block line-clamp-1">
                            {candidate.name}
                          </strong>
                          <span className="text-[10px] text-slate-400 block line-clamp-1">
                            {candidate.role}
                          </span>
                        </div>
                      </div>
                      <MatchScoreBadge score={candidate.match} size="sm" showIcon={false} />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {candidate.skills?.slice(0, 2).map((sk) => (
                        <span
                          key={sk}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>

                    {/* Stage transition controls */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1">
                      <button
                        onClick={() => handleQuickScreen(candidate)}
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[10px] flex items-center gap-1 font-medium"
                        title="AI Sàng lọc nhanh"
                      >
                        <Sparkles className="w-3 h-3" /> AI Khuyên
                      </button>

                      <select
                        value={candidate.stage}
                        onChange={(e) =>
                          handleMoveStage(candidate.id, e.target.value)
                        }
                        className="text-[10px] py-1 px-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        {stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            Chuyển: {stg.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Card>
                ))}

                {stageCandidates.length === 0 && (
                  <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    Chưa có hồ sơ
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
