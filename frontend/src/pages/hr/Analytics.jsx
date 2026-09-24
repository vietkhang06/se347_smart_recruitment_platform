import React from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FunnelChart } from '../../components/chart/FunnelChart';
import { BarChart } from '../../components/chart/BarChart';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import {
  BarChart3,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Download,
  Share2,
} from 'lucide-react';

export const HRAnalytics = () => {
  const { toast, triggerToast } = useToast();

  const metrics = [
    {
      label: 'Thời gian tuyển TB',
      value: '18 ngày',
      change: '-3 ngày so với quý trước',
      icon: Clock,
      color: 'emerald',
    },
    {
      label: 'Tỷ lệ qua sàng lọc',
      value: '34%',
      change: '+4.8% qua MatchAI',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      label: 'Chi phí / Ứng viên',
      value: '284.000đ',
      change: '-8.2% tối ưu chi phí',
      icon: DollarSign,
      color: 'teal',
    },
    {
      label: 'Tỷ lệ nhận Offer',
      value: '81%',
      change: '+2.1% hài lòng cao',
      icon: CheckCircle,
      color: 'amber',
    },
  ];

  const sourceData = [
    { name: 'Tìm kiếm MatchAI', percentage: 42 },
    { name: 'Giới thiệu nội bộ (Referral)', percentage: 24 },
    { name: 'Trang việc làm công ty', percentage: 18 },
    { name: 'Mạng xã hội & LinkedIn', percentage: 10 },
    { name: 'Kênh tuyển dụng khác', percentage: 6 },
  ];

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            Báo cáo & Phân tích hiệu quả tuyển dụng
          </h1>
          <p className="text-xs text-slate-500">
            Đo lường chi tiết phễu tuyển dụng, thời gian chuyển đổi và chất lượng nguồn ứng viên.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={() => triggerToast('Báo cáo PDF đã sẵn sàng tải xuống!', 'success')}
          >
            Tải báo cáo PDF
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="p-4 sm:p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  {m.label}
                </span>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {m.value}
                </h3>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {m.change}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Funnel & Channels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Phễu tuyển dụng (Hiring Funnel)
            </h3>
            <p className="text-xs text-slate-500">
              Tỷ lệ chuyển đổi qua từng bước trong 30 ngày qua
            </p>
          </div>
          <FunnelChart />
        </Card>

        {/* Candidate Sources */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Chất lượng theo nguồn ứng viên
            </h3>
            <p className="text-xs text-slate-500">
              Phân bổ ứng viên chất lượng được tuyển chọn thành công
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {sourceData.map((src) => (
              <div key={src.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300">
                    {src.name}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {src.percentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${src.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
