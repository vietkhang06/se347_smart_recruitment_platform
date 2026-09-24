import React from 'react';
import { Search } from 'lucide-react';

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  className = '',
  onKeyDown,
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-all"
      />
    </div>
  );
};
