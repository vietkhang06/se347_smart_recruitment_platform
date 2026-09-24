import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FormField } from '../../components/form/FormField';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ROLES } from '../../constants';
import { Briefcase, Building2, User } from 'lucide-react';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || ROLES.CANDIDATE;
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name || name.length < 2) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Email không đúng định dạng.');
      return;
    }
    if (role === ROLES.EMPLOYER && !company) {
      setError('Vui lòng nhập tên công ty hoặc doanh nghiệp.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    if (!agreeTerms) {
      setError('Bạn cần đồng ý với điều khoản sử dụng.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      register({ name, email, password, role, company });
      setLoading(false);
      if (role === ROLES.EMPLOYER) {
        navigate('/hr/dashboard');
      } else {
        navigate('/candidate/dashboard');
      }
    }, 450);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tạo tài khoản Matcha<span className="text-emerald-500">Job</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {role === ROLES.EMPLOYER
              ? 'Đăng ký nhà tuyển dụng để tìm kiếm nhân tài chất lượng cao'
              : 'Đăng ký ứng viên để khám phá cơ hội nghề nghiệp phù hợp'}
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          {/* Role selector tabs */}
          <div className="grid grid-cols-2 p-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setRole(ROLES.CANDIDATE)}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === ROLES.CANDIDATE
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Ứng viên
            </button>
            <button
              type="button"
              onClick={() => setRole(ROLES.EMPLOYER)}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                role === ROLES.EMPLOYER
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Nhà tuyển dụng
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Họ và tên" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Email" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            {role === ROLES.EMPLOYER && (
              <FormField label="Tên công ty / Doanh nghiệp" required>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Công ty Cổ phần Công nghệ XYZ"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
                />
              </FormField>
            )}

            <FormField label="Mật khẩu" required>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Nhập lại mật khẩu" required>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Tôi đồng ý với các Điều khoản & Chính sách bảo mật</span>
            </label>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full mt-2"
            >
              Đăng ký tài khoản
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Đã có tài khoản?{' '}
          <Link
            to={`/auth/login?role=${role}`}
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};
