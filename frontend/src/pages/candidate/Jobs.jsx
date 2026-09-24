import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { JobFilter } from '../../components/job/JobFilter';
import { JobCard } from '../../components/job/JobCard';
import { Modal } from '../../components/modal/Modal';
import { Button } from '../../components/common/Button';
import { FormField } from '../../components/form/FormField';
import { EmptyState } from '../../components/common/EmptyState';
import { jobService } from '../../services/jobService';
import { candidateService } from '../../services/candidateService';
import { applicationService } from '../../services/applicationService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import { Briefcase, Building2, MapPin, DollarSign, Sparkles } from 'lucide-react';

export const CandidateJobs = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [filters, setFilters] = useState({ q: initialQuery });
  const [savedJobIds, setSavedJobIds] = useState(() =>
    candidateService.getSavedJobIds()
  );
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { toast, triggerToast } = useToast();

  const jobs = jobService.getJobs(filters);

  const handleSave = (id) => {
    const isSaved = candidateService.toggleSaveJob(id);
    setSavedJobIds(candidateService.getSavedJobIds());
    triggerToast(
      isSaved ? 'Đã lưu việc làm vào danh sách quan tâm' : 'Đã bỏ lưu việc làm',
      'success'
    );
  };

  const handleOpenApply = (job) => {
    setSelectedJobForApply(job);
    setCoverNote('');
  };

  const handleConfirmApply = (e) => {
    e.preventDefault();
    if (!selectedJobForApply) return;

    setSubmitting(true);
    setTimeout(() => {
      const res = applicationService.applyForJob(selectedJobForApply, {
        notes: coverNote,
      });
      setSubmitting(false);
      setSelectedJobForApply(null);
      if (res.success) {
        triggerToast(
          `Đã gửi đơn ứng tuyển vào vị trí ${selectedJobForApply.title}!`,
          'success'
        );
      } else {
        triggerToast(res.message, 'warning');
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Tìm kiếm cơ hội việc làm
        </h1>
        <p className="text-xs text-slate-500">
          Khám phá hàng trăm cơ hội việc làm được xếp hạng theo thuật toán AI phù hợp với năng lực của bạn.
        </p>
      </div>

      {/* Filter Component */}
      <JobFilter
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({})}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 font-medium">
          Tìm thấy <strong>{jobs.length}</strong> vị trí phù hợp
        </p>
      </div>

      {/* Job Grid */}
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSaved={savedJobIds.includes(Number(job.id))}
              onSave={handleSave}
              onApply={handleOpenApply}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title="Không tìm thấy việc làm nào"
          description="Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc để xem nhiều kết quả hơn."
          actionText="Xóa bộ lọc"
          onAction={() => setFilters({})}
        />
      )}

      {/* Apply Modal */}
      <Modal
        isOpen={!!selectedJobForApply}
        onClose={() => setSelectedJobForApply(null)}
        title={`Ứng tuyển: ${selectedJobForApply?.title}`}
        subtitle={`${selectedJobForApply?.company} · ${selectedJobForApply?.location}`}
      >
        {selectedJobForApply && (
          <form onSubmit={handleConfirmApply} className="space-y-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Độ tương thích hồ sơ với vị trí:
              </span>
              <strong className="text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                {selectedJobForApply.match}%
              </strong>
            </div>

            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <p>
                <strong>Mức lương:</strong> {selectedJobForApply.salary}
              </p>
              <p>
                <strong>Hình thức:</strong> {selectedJobForApply.type}
              </p>
              <p>
                <strong>Kinh nghiệm yêu cầu:</strong> {selectedJobForApply.exp}
              </p>
            </div>

            <FormField
              label="Lời nhắn / Thư giới thiệu gửi nhà tuyển dụng"
              className="pt-2"
            >
              <textarea
                rows={3}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Nêu bật lý do bạn là ứng viên phù hợp nhất cho vị trí này..."
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedJobForApply(null)}
              >
                Hủy bỏ
              </Button>
              <Button type="submit" size="sm" loading={submitting}>
                Xác nhận nộp đơn
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
