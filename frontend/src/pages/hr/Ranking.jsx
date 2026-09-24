import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { MatchScoreBadge } from '../../components/matching/MatchScoreBadge';
import { MatchBreakdown } from '../../components/matching/MatchBreakdown';
import { jobService } from '../../services/jobService';
import { candidateService } from '../../services/candidateService';
import { matchingService } from '../../services/matchingService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import { Sparkles, Trophy, Check, ArrowUpDown, Download, Mail } from 'lucide-react';

export const HRRanking = () => {
  const { toast, triggerToast } = useToast();
  const jobs = jobService.getJobs();
  const [selectedJobId, setSelectedJobId] = useState(jobs[0]?.id || 1);
  const selectedJob = jobs.find((j) => String(j.id) === String(selectedJobId)) || jobs[0];

  const rawCandidates = candidateService.getCandidates();
  const rankedCandidates = matchingService.getTopCandidatesForJob(
    selectedJob,
    rawCandidates
  );

  const [expandedCandidateId, setExpandedCandidateId] = useState(
    rankedCandidates[0]?.id || null
  );

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Xếp hạng ứng viên bằng MatchAI
          </h1>
          <p className="text-xs text-slate-500">
            Hệ thống tự động chấm điểm và sắp xếp ứng viên theo mức độ phù hợp cao nhất với tiêu chí công việc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => triggerToast('Đã xuất báo cáo bảng xếp hạng CSV', 'success')}
          >
            Xuất xếp hạng
          </Button>
          <Button
            size="sm"
            icon={Mail}
            onClick={() =>
              triggerToast('Đã gửi thư mời phỏng vấn tới Top 3 ứng viên hàng đầu!', 'success')
            }
          >
            Mời Top 3 phỏng vấn
          </Button>
        </div>
      </div>

      {/* Select Target Job */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Vị trí đang đánh giá:
          </span>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.company}) - {j.location}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Tổng cộng: <strong>{rankedCandidates.length}</strong> ứng viên trong danh sách
        </div>
      </Card>

      {/* Ranked Candidate List */}
      <div className="space-y-4">
        {rankedCandidates.map((c, index) => {
          const isTop3 = index < 3;
          const isExpanded = expandedCandidateId === c.id;

          return (
            <Card
              key={c.id}
              className={`p-5 space-y-4 transition-all ${
                isTop3
                  ? 'border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-transparent'
                  : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Rank Position Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                      index === 0
                        ? 'bg-amber-400 text-amber-950 shadow-md shadow-amber-400/30'
                        : index === 1
                        ? 'bg-slate-300 text-slate-800'
                        : index === 2
                        ? 'bg-amber-700/30 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    #{index + 1}
                  </div>

                  <div className="w-11 h-11 rounded-2xl bg-emerald-600/10 text-emerald-600 font-bold text-sm flex items-center justify-center shrink-0">
                    {c.initials}
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      {c.name}
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 flex items-center gap-1 shadow-2xs">
                          <Sparkles className="w-3 h-3" /> BEST MATCH
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {c.role} · {c.experience} kinh nghiệm · {c.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <MatchScoreBadge score={c.match} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedCandidateId(isExpanded ? null : c.id)
                    }
                  >
                    {isExpanded ? 'Thu gọn' : 'Xem phân tích AI'}
                  </Button>
                </div>
              </div>

              {/* AI Summary Quote */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{c.aiSummary}</span>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="pt-2 animate-in fade-in duration-200">
                  <MatchBreakdown breakdown={c.breakdown} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
