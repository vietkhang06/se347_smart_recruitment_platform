import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import {
  Briefcase,
  Sun,
  Moon,
  LogOut,
  User,
  Heart,
  FileText,
  LayoutDashboard,
  Shield,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { ROLES } from '../../constants';

export const Navbar = () => {
  const { user, isAuthenticated, logout, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const navLinks = [
    { label: 'Việc làm', path: '/candidate/jobs' },
    { label: 'Doanh nghiệp', path: '/candidate/jobs?tab=companies' },
    { label: 'Hồ sơ & CV', path: '/candidate/profile' },
    { label: 'Đơn ứng tuyển', path: '/candidate/applications' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white">
                Matcha<span className="text-emerald-500">Job</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                AI Recruitment
              </span>
            </div>
          </Link>

          {/* Nav Links for Candidate / Public */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Role Switcher (for development and demo convenience) */}
          <div className="hidden lg:flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => {
                switchRole(ROLES.CANDIDATE);
                navigate('/candidate/dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                user?.role === ROLES.CANDIDATE
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ứng viên
            </button>
            <button
              onClick={() => {
                switchRole(ROLES.EMPLOYER);
                navigate('/hr/dashboard');
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                user?.role === ROLES.EMPLOYER
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Nhà tuyển dụng
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            aria-label="Đổi giao diện"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* User Auth Info */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-full border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                  {user?.initials || 'MJ'}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-slate-800 dark:text-slate-200">
                  {user?.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 mr-1" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-20 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      {user?.role === ROLES.EMPLOYER ? (
                        <>
                          <Link
                            to="/hr/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                          >
                            <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                            HR Dashboard
                          </Link>
                          <Link
                            to="/hr/jobs"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                          >
                            <Briefcase className="w-4 h-4 text-emerald-500" />
                            Tin tuyển dụng
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/candidate/dashboard"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                          >
                            <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                            Bảng điều khiển
                          </Link>
                          <Link
                            to="/candidate/profile"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                          >
                            <User className="w-4 h-4 text-emerald-500" />
                            Hồ sơ của tôi
                          </Link>
                          <Link
                            to="/candidate/my-cv"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                          >
                            <FileText className="w-4 h-4 text-emerald-500" />
                            MatchAI Scan CV
                          </Link>
                          <Link
                            to="/candidate/applications"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                          >
                            <FileText className="w-4 h-4 text-emerald-500" />
                            Đơn ứng tuyển
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/auth/register"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};
