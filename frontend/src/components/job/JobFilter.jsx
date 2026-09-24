import React from 'react';
import { SearchInput } from '../form/SearchInput';
import { CATEGORIES, LOCATIONS, JOB_TYPES } from '../../constants';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '../common/Button';

export const JobFilter = ({ filters, onChange, onReset }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Search Input */}
      <SearchInput
        value={filters.q || ''}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        placeholder="Tìm theo chức danh, công ty hoặc từ khóa kỹ năng..."
      />

      {/* Select Filters Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        <select
          value={filters.category || 'Tất cả ngành nghề'}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-700 dark:text-slate-200"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filters.location || 'Tất cả địa điểm'}
          onChange={(e) => onChange({ ...filters, location: e.target.value })}
          className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-700 dark:text-slate-200"
        >
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <select
          value={filters.type || 'Tất cả hình thức'}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          className="px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-700 dark:text-slate-200"
        >
          <option value="Tất cả hình thức">Tất cả hình thức</option>
          {JOB_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            icon={RotateCcw}
            className="w-full"
          >
            Đặt lại
          </Button>
        )}
      </div>
    </div>
  );
};
