import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/modal/Modal';
import { FormField } from '../../components/form/FormField';
import { SearchInput } from '../../components/form/SearchInput';
import { jobService } from '../../services/jobService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import {
  Briefcase,
  Plus,
  Eye,
  MoreHorizontal,
  MapPin,
  Calendar,
  DollarSign,
  Users,
} from 'lucide-react';

export const HRJobs = () => {
  const [searchParams] = useSearchParams();
  const shouldOpenCreate = searchParams.get('action') === 'create';
  const { toast, triggerToast } = useToast();

  const [jobs, setJobs] = useState(() => jobService.getJobs());
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(shouldOpenCreate);

  // New Job Form State
  const [newJob, setNewJob] = useState({
    title: '',
    department: 'Engineering',
    location: 'TP. Hồ Chí Minh',
    type: 'Toàn thời gian',
    salary: '25–40 triệu',
    exp: '2+ năm',
    description: '',
    skills: 'React, TypeScript, TailwindCSS',
  });

  const filteredJobs = jobs.filter((j) => {
    const matchStatus =
      statusFilter === 'Tất cả' || j.status === statusFilter;
    const matchSearch =
      !searchQuery ||
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(j.id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleCreateJob = (e) => {
    e.preventDefault();
    if (!newJob.title) {
      triggerToast('Vui lòng nhập chức danh tuyển dụng', 'warning');
      return;
    }

    const created = jobService.createJob({
      ...newJob,
      skills: newJob.skills.split(',').map((s) => s.trim()),
    });

    setJobs(jobService.getJobs());
    setIsCreateModalOpen(false);
    setNewJob({
      title: '',
      department: 'Engineering',
      location: 'TP. Hồ Chí Minh',
      type: 'Toàn thời gian',
      salary: '25–40 triệu',
      exp: '2+ năm',
      description: '',
      skills: 'React, TypeScript, TailwindCSS',
    });
    triggerToast(`Đã xuất bản tin tuyển dụng "${created.title}" thành công!`, 'success');
  };

  const handleToggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'Đang tuyển' ? 'Tạm dừng' : 'Đang tuyển';
    jobService.updateJobStatus(id, nextStatus);
    setJobs(jobService.getJobs());
    triggerToast(`Đã cập nhật trạng thái tin sang "${nextStatus}"`, 'neutral');
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quản lý tin tuyển dụng
          </h1>
          <p className="text-xs text-slate-500">
            Theo dõi danh sách các vị trí đang mở, số lượt ứng tuyển và tình trạng duyệt tin.
          </p>
        </div>

        <Button
          size="sm"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Tạo tin tuyển dụng
        </Button>
      </div>

      {/* Toolbar: Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold overflow-x-auto">
          {['Tất cả', 'Đang tuyển', 'Chờ duyệt', 'Tạm dừng', 'Đã đóng'].map(
            (st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>

        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo chức danh hoặc mã tin..."
          className="w-full sm:w-72"
        />
      </div>

      {/* Jobs Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 font-semibold">
                <th className="py-3 px-4">Vị trí tuyển dụng</th>
                <th className="py-3 px-4">Địa điểm</th>
                <th className="py-3 px-4">Lượt ứng tuyển</th>
                <th className="py-3 px-4">Ngày đăng</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <strong className="text-sm font-semibold text-slate-900 dark:text-white block">
                      {job.title}
                    </strong>
                    <span className="text-[11px] text-slate-400">
                      Mã: {job.id} · {job.category || 'Engineering'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {job.location}
                  </td>
                  <td className="py-3.5 px-4">
                    <strong className="font-semibold text-slate-900 dark:text-white">
                      {job.applicants || 0} hồ sơ
                    </strong>
                    <span className="text-[11px] text-slate-400 block">
                      {job.views || 0} lượt xem
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{job.posted}</td>
                  <td className="py-3.5 px-4">
                    <Badge>{job.status}</Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          triggerToast(`Đang xem chi tiết tin: ${job.title}`, 'neutral')
                        }
                      >
                        Chi tiết
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(job.id, job.status)}
                      >
                        {job.status === 'Đang tuyển' ? 'Tạm dừng' : 'Kích hoạt'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Job Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo tin tuyển dụng mới"
        subtitle="Cung cấp thông tin chi tiết để thuật toán MatchAI tìm kiếm ứng viên thích hợp"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <FormField label="Chức danh tuyển dụng" required>
            <input
              type="text"
              value={newJob.title}
              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
              placeholder="ví dụ: Senior React Developer"
              className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Khoảng lương">
              <input
                type="text"
                value={newJob.salary}
                onChange={(e) =>
                  setNewJob({ ...newJob, salary: e.target.value })
                }
                placeholder="25–40 triệu"
                className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Địa điểm">
              <input
                type="text"
                value={newJob.location}
                onChange={(e) =>
                  setNewJob({ ...newJob, location: e.target.value })
                }
                placeholder="TP. Hồ Chí Minh"
                className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>
          </div>

          <FormField label="Kỹ năng yêu cầu (phân cách bằng dấu phẩy)">
            <input
              type="text"
              value={newJob.skills}
              onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
              placeholder="React, TypeScript, CSS, Testing"
              className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
            />
          </FormField>

          <FormField label="Mô tả công việc & Trách nhiệm chính">
            <textarea
              rows={3}
              value={newJob.description}
              onChange={(e) =>
                setNewJob({ ...newJob, description: e.target.value })
              }
              placeholder="Mô tả các yêu cầu dự án, mục tiêu và quyền lợi cho ứng viên..."
              className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Đăng tin tuyển dụng
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
