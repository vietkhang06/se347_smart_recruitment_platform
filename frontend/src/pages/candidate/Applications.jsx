import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/modal/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { applicationService } from '../../services/applicationService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import {
  FileText,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  Eye,
} from 'lucide-react';

export const CandidateApplications = () => {
  const { toast, triggerToast } = useToast();
  const [applications, setApplications] = useState(() =>
    applicationService.getApplications()
  );
  const [selectedApp, setSelectedApp] = useState(null);

  const stages = ['Đã gửi hồ sơ', 'Sàng lọc', 'Bài kiểm tra', 'Phỏng vấn', 'Đề nghị'];

  const getStageIndex = (stageName) => {
    if (stageName === 'Mới' || stageName === 'Đã gửi hồ sơ') return 0;
    if (stageName === 'Sàng lọc' || stageName === 'Đã xem hồ sơ') return 1;
    if (stageName === 'Bài kiểm tra') return 2;
    if (stageName === 'Phỏng vấn') return 3;
    if (stageName === 'Đề nghị') return 4;
    return 1;
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Tiến trình đơn ứng tuyển
        </h1>
        <p className="text-xs text-slate-500">
          Theo dõi sát sao từng giai đoạn tuyển dụng và lịch phỏng vấn tiếp theo.
        </p>
      </div>

      {applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => {
            const currentStageIdx = getStageIndex(app.stage);
            return (
              <Card key={app.id} className="p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      {app.logo}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {app.title}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {app.company}
                        </span>
                        <span>•</span>
                        <span>Nộp ngày {app.date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge>{app.stage}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Eye}
                      onClick={() => setSelectedApp(app)}
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>

                {/* Visual Step Progress Bar */}
                <div className="pt-2">
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {stages.map((stg, idx) => {
                      const isDone = idx <= currentStageIdx;
                      const isCurrent = idx === currentStageIdx;
                      return (
                        <div key={stg} className="space-y-1.5">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isDone
                                ? 'bg-emerald-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <span
                            className={`text-[11px] block truncate ${
                              isCurrent
                                ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                : isDone
                                ? 'text-slate-700 dark:text-slate-300 font-medium'
                                : 'text-slate-400'
                            }`}
                          >
                            {stg}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    Bước tiếp theo: {app.next}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Mã đơn: {app.id}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Chưa có đơn ứng tuyển nào"
          description="Bạn chưa nộp hồ sơ vào vị trí nào. Hãy khám phá danh sách việc làm để bắt đầu ứng tuyển ngay!"
        />
      )}

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title="Thông tin chi tiết đơn ứng tuyển"
        subtitle={selectedApp?.title}
      >
        {selectedApp && (
          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
              <p>
                <strong>Vị trí:</strong> {selectedApp.title}
              </p>
              <p>
                <strong>Doanh nghiệp:</strong> {selectedApp.company}
              </p>
              <p>
                <strong>Ngày nộp đơn:</strong> {selectedApp.date}
              </p>
              <p>
                <strong>Trạng thái hồ sơ:</strong> {selectedApp.stage}
              </p>
              <p>
                <strong>Kế hoạch tiếp theo:</strong> {selectedApp.next}
              </p>
              {selectedApp.notes && (
                <p>
                  <strong>Ghi chú:</strong> {selectedApp.notes}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setSelectedApp(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
