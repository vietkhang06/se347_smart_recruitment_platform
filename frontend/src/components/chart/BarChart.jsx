import React from 'react';

export const BarChart = ({
  data = [
    { label: 'T2', value: 42 },
    { label: 'T3', value: 58 },
    { label: 'T4', value: 49 },
    { label: 'T5', value: 72 },
    { label: 'T6', value: 66 },
    { label: 'T7', value: 92 },
    { label: 'CN', value: 78 },
  ],
  title = 'Hiệu suất ứng tuyển',
  subtitle = '7 ngày gần nhất',
  change = '+12.8%',
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {title}
          </h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
        {change && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {change}
          </span>
        )}
      </div>

      {/* Chart Bars */}
      <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2">
        {data.map((item, index) => (
          <div
            key={item.label || index}
            className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
          >
            <div className="relative w-full flex items-end justify-center h-full">
              <div
                style={{ height: `${item.value}%` }}
                className="w-full max-w-[28px] bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg group-hover:from-emerald-500 group-hover:to-teal-300 transition-all duration-300 shadow-sm"
              />
              {/* Tooltip on hover */}
              <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap shadow-xs">
                {item.value} hồ sơ
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
