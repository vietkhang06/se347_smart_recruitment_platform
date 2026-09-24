import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FormField } from '../../components/form/FormField';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ROLES } from '../../constants';
import { Briefcase, Eye, EyeOff, Sparkles, Shield, User } from 'lucide-react';

export const Login = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || ROLES.CANDIDATE;
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login(email, password, role);
      setLoading(false);
      if (role === ROLES.EMPLOYER || role === ROLES.ADMIN) {
        navigate('/hr/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    }, 400);
  };

  const handleDemoFill = (targetRole) => {
    setRole(targetRole);
    if (targetRole === ROLES.EMPLOYER) {
      setEmail('lananh@fpt.com');
      setPassword('password123');
    } else if (targetRole === ROLES.ADMIN) {
      setEmail('admin@matchajob.vn');
      setPassword('password123');
    } else {
      setEmail('ankhang@example.com');
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Đăng nhập Matcha<span className="text-emerald-500">Job</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nền tảng tuyển dụng thông minh tích hợp AI
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          {/* Role selector tabs */}
          <div className="grid grid-cols-3 p-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleRoleChange(ROLES.CANDIDATE)}
              className={`py-2 rounded-lg transition-all ${
                role === ROLES.CANDIDATE
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ứng viên
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange(ROLES.EMPLOYER)}
              className={`py-2 rounded-lg transition-all ${
                role === ROLES.EMPLOYER
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Nhà tuyển dụng
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange(ROLES.ADMIN)}
              className={`py-2 rounded-lg transition-all ${
                role === ROLES.ADMIN
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Quản trị viên
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email" required error={error && !email ? error : ''}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === ROLES.EMPLOYER
                    ? 'hr@company.com'
                    : role === ROLES.ADMIN
                    ? 'admin@matchajob.vn'
                    : 'candidate@example.com'
                }
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Mật khẩu" required>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </FormField>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full mt-2"
            >
              Đăng nhập với vai trò{' '}
              {role === ROLES.CANDIDATE
                ? 'Ứng viên'
                : role === ROLES.EMPLOYER
                ? 'Nhà tuyển dụng'
                : 'Quản trị viên'}
            </Button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Dùng thử nhanh (Tài khoản mẫu)
            </span>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill(ROLES.CANDIDATE)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                Ứng viên Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill(ROLES.EMPLOYER)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                HR Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill(ROLES.ADMIN)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                Admin Demo
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Chưa có tài khoản?{' '}
          <Link
            to={`/auth/register?role=${role}`}
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
