import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { FormField } from '../../components/form/FormField';
import { candidateService } from '../../services/candidateService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import { User, Mail, Phone, MapPin, Briefcase, Plus, X, Check } from 'lucide-react';

export const CandidateProfile = () => {
  const { toast, triggerToast } = useToast();
  const [profile, setProfile] = useState(() => candidateService.getProfile());
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkill.trim() && !profile.skills?.includes(newSkill.trim())) {
      setProfile((prev) => ({
        ...prev,
        skills: [...(prev.skills || []), newSkill.trim()],
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      candidateService.saveProfile(profile);
      setLoading(false);
      triggerToast('Đã lưu thông tin hồ sơ thành công!', 'success');
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Toast toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Hồ sơ ứng viên & CV
        </h1>
        <p className="text-xs text-slate-500">
          Cập nhật thông tin chi tiết giúp thuật toán MatchAI đề xuất công việc chính xác nhất.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              AK
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {profile.fullName}
              </h2>
              <p className="text-xs text-slate-500">{profile.role}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Sẵn sàng nhận cơ hội việc làm
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Họ và tên" required>
              <input
                type="text"
                value={profile.fullName || ''}
                onChange={(e) => handleChange('fullName', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Vị trí / Chức danh hiện tại" required>
              <input
                type="text"
                value={profile.role || ''}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Email liên hệ" required>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Số điện thoại" required>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Địa điểm làm việc mong muốn">
              <input
                type="text"
                value={profile.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>

            <FormField label="Số năm kinh nghiệm">
              <input
                type="text"
                value={profile.experience || ''}
                onChange={(e) => handleChange('experience', e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              />
            </FormField>
          </div>

          <FormField label="Giới thiệu bản thân & Mục tiêu nghề nghiệp">
            <textarea
              rows={4}
              value={profile.bio || ''}
              onChange={(e) => handleChange('bio', e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              placeholder="Mô tả kinh nghiệm, thành tựu nổi bật và định hướng phát triển của bạn..."
            />
          </FormField>
        </Card>

        {/* Skills Card */}
        <Card className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Kỹ năng chuyên môn
            </h3>
            <p className="text-xs text-slate-500">
              Các kỹ năng này sẽ được dùng để đối soát tự động với yêu cầu công việc.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Nhập kỹ năng mới (ví dụ: React, Figma, SQL)..."
              className="flex-1 px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSkill(e);
                }
              }}
            />
            <Button size="sm" onClick={handleAddSkill} icon={Plus}>
              Thêm
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {profile.skills?.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="hover:text-rose-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={loading} icon={Check}>
            Lưu thay đổi hồ sơ
          </Button>
        </div>
      </form>
    </div>
  );
};
