import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { BarChart } from '../../components/chart/BarChart';
import { CandidateRow } from '../../components/candidate/CandidateRow';
import { candidateService } from '../../services/candidateService';
import { jobService } from '../../services/jobService';
import {
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
  FileCheck,
} from 'lucide-react';

export const HRDashboard = () => {
  const navigate = useNavigate();
  const candidates = candidateService.getCandidates().slice(0, 4);
  const jobs = jobService.getJobs();

  const metrics = [
    {
      label: 'Tin đang tuyển',
      value: '12',
      change: '+2 tuần này',
      icon: Briefcase,
      color: 'emerald',
    },
    {
      label: 'Ứng viên mới',
      value: '148',
      change: '+18.4%',
      icon: Users,
      color: 'purple',
    },
    {
      label: 'Lịch phỏng vấn',
      value: '18',
      change: '6 hôm nay',
      icon: Calendar,
      color: 'amber',
    },
    {
      label: 'Tỷ lệ phản hồi',
      value: '92%',
      change: '+4.2%',
      icon: TrendingUp,
      color: 'teal',
    },
  ];

  const upcomingInterviews = [
    {
      time: '09:00',
      date: '19/09',
      candidate: 'Nguyễn An Khang',
      role: 'Senior Product Designer',
      type: 'Phỏng vấn chuyên môn',
      status: 'Sắp diễn ra',
    },
    {
      time: '13:30',
      date: '19/09',
      candidate: 'Trần Minh Anh',
      role: 'Product Designer',
      type: 'Portfolio review',
      status: 'Đã xác nhận',
    },
    {
      time: '10:00',
      date: '20/09',
      candidate: 'Lê Quốc Huy',
      role: 'Frontend Engineer',
      type: 'Technical interview',
      status: 'Chờ xác nhận',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Chào buổi sáng, FPT Talent!
          </h1>
          <p className="text-xs text-slate-500">
            Đây là tình hình tuyển dụng tổng quan và danh sách công việc cần ưu tiên hôm nay.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/hr/analytics')}
          >
            Xuất báo cáo
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => navigate('/hr/jobs?action=create')}
          >
            Tạo tin tuyển dụng
          </Button>
        </div>
      </div>

      {/* Metrics Strip */}
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

      {/* Main Grid: Chart & Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <BarChart
            title="Hiệu suất ứng tuyển 7 ngày gần nhất"
            subtitle="Số lượng hồ sơ gửi vào hệ thống"
            change="+12.8% so với tuần trước"
          />
        </Card>

        {/* Interviews schedule */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Lịch phỏng vấn sắp tới
            </h3>
            <span className="text-xs text-slate-400">Hôm nay</span>
          </div>

          <div className="space-y-3">
            {upcomingInterviews.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-900 dark:text-white">
                    {item.candidate}
                  </span>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="text-[11px] text-slate-500">
                  {item.type} · {item.role}
                </p>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.time} - {item.date}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Candidates & Quick Ranking preview */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Ứng viên tiềm năng hàng đầu (MatchAI Ranking)
            </h3>
            <p className="text-xs text-slate-500">
              Xếp hạng theo thuật toán đối soát kỹ năng và kinh nghiệm thực tế
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/hr/ranking')}
          >
            Xem bảng xếp hạng đầy đủ <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {candidates.map((c) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              onView={() => navigate('/hr/candidates')}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};
