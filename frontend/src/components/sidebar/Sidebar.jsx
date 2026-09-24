import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  GitPullRequest,
  Award,
  BarChart3,
  FileText,
  User,
  Heart,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const Sidebar = ({ type = 'hr' }) => {
  const hrLinks = [
    { label: 'Tổng quan', path: '/hr/dashboard', icon: LayoutDashboard },
    { label: 'Tin tuyển dụng', path: '/hr/jobs', icon: Briefcase },
    { label: 'Kho ứng viên', path: '/hr/candidates', icon: Users },
    { label: 'Sàng lọc hồ sơ', path: '/hr/screening', icon: GitPullRequest },
    { label: 'Xếp hạng MatchAI', path: '/hr/ranking', icon: Sparkles },
    { label: 'Báo cáo & Phân tích', path: '/hr/analytics', icon: BarChart3 },
  ];

  const candidateLinks = [
    { label: 'Bảng điều khiển', path: '/candidate/dashboard', icon: LayoutDashboard },
    { label: 'Tìm việc làm', path: '/candidate/jobs', icon: Briefcase },
    { label: 'Đơn ứng tuyển', path: '/candidate/applications', icon: FileText },
    { label: 'MatchAI Scan CV', path: '/candidate/my-cv', icon: Sparkles },
    { label: 'Hồ sơ cá nhân', path: '/candidate/profile', icon: User },
  ];

  const links = type === 'hr' ? hrLinks : candidateLinks;

  return (
    <aside className="w-64 shrink-0 hidden md:block border-r border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-4 space-y-6 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {type === 'hr' ? 'Quản lý tuyển dụng' : 'Không gian ứng viên'}
        </span>
        <div className="pt-2 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
