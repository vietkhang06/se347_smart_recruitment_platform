import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { JobCard } from '../../components/job/JobCard';
import { jobService } from '../../services/jobService';
import { candidateService } from '../../services/candidateService';
import { applicationService } from '../../services/applicationService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import {
  Sparkles,
  FileText,
  Heart,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const CandidateDashboard = () => {
  const { user } = useAuth();
  const { toast, triggerToast } = useToast();
  const navigate = useNavigate();

  const [savedJobIds, setSavedJobIds] = useState(() =>
    candidateService.getSavedJobIds()
  );
  const jobs = jobService.getJobs().slice(0, 4);
  const applications = applicationService.getApplications().slice(0, 3);

  const handleSave = (id) => {
    const isNowSaved = candidateService.toggleSaveJob(id);
    setSavedJobIds(candidateService.getSavedJobIds());
    triggerToast(
      isNowSaved ? 'Đã lưu việc làm vào danh sách' : 'Đã bỏ lưu việc làm',
      'success'
    );
  };

  const handleApply = (job) => {
    const res = applicationService.applyForJob(job);
    if (res.success) {
      triggerToast(`Ứng tuyển thành công vị trí ${job.title}!`, 'success');
      setTimeout(() => navigate('/candidate/applications'), 600);
    } else {
      triggerToast(res.message, 'warning');
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      <Toast toast={toast} />

      {/* Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 sm:p-8 shadow-xl shadow-emerald-900/10">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-emerald-100">
            <Sparkles className="w-3.5 h-3.5" /> MatchAI Tuyển Dụng Thông Minh
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Xin chào, {user?.name || 'Nguyễn An Khang'}!
          </h1>
          <p className="text-sm text-emerald-100 leading-relaxed">
            Hôm nay có <strong>14 việc làm mới</strong> phù hợp trên 90% với hồ sơ của bạn. Hãy kiểm tra các cơ hội và cập nhật tiến trình ứng tuyển.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/candidate/jobs')}
            >
              Khám phá việc làm ngay
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
              onClick={() => navigate('/candidate/my-cv')}
            >
              Scan & Tối ưu CV
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Đơn đang ứng tuyển
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {applications.length}
            </h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Việc làm đã lưu
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {savedJobIds.length}
            </h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Độ hoàn thiện hồ sơ
            </p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              95%
            </h3>
          </div>
        </Card>
      </div>

      {/* Recommended Jobs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Việc làm MatchAI gợi ý cho bạn
            </h2>
            <p className="text-xs text-slate-500">
              Dựa trên kỹ năng và mục tiêu nghề nghiệp của bạn
            </p>
          </div>
          <Link
            to="/candidate/jobs"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedJobIds.includes(Number(job.id))}
              onSave={handleSave}
              onApply={handleApply}
            />
          ))}
        </div>
      </div>

      {/* Application Status Snippet */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Tiến trình ứng tuyển gần đây
            </h2>
            <p className="text-xs text-slate-500">
              Theo dõi phản hồi từ các nhà tuyển dụng
            </p>
          </div>
          <Link
            to="/candidate/applications"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Chi tiết đơn <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <Card className="divide-y divide-slate-100 dark:divide-slate-800 p-0 overflow-hidden">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0">
                  {app.logo}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {app.title}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {app.company} · Nộp ngày {app.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {app.stage}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{app.next}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/candidate/applications')}
                >
                  Chi tiết
                </Button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
