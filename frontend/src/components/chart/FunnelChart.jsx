import React from 'react';

export const FunnelChart = ({
  steps = [
    { label: 'Lượt xem tin', count: '1.842', pct: 100, color: 'bg-emerald-500' },
    { label: 'Nộp hồ sơ', count: '486', pct: 76, color: 'bg-teal-500' },
    { label: 'Qua sàng lọc', count: '164', pct: 54, color: 'bg-blue-500' },
    { label: 'Phỏng vấn', count: '58', pct: 36, color: 'bg-indigo-500' },
    { label: 'Nhận việc (Offer)', count: '18', pct: 22, color: 'bg-purple-500' },
  ],
}) => {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {step.label}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {step.count}
              </span>
              <span className="text-slate-400">({step.pct}%)</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${step.color} transition-all duration-500 shadow-xs`}
              style={{ width: `${step.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
