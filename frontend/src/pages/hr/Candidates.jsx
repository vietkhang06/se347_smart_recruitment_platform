import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { CandidateCard } from '../../components/candidate/CandidateCard';
import { SearchInput } from '../../components/form/SearchInput';
import { Modal } from '../../components/modal/Modal';
import { MatchBreakdown } from '../../components/matching/MatchBreakdown';
import { candidateService } from '../../services/candidateService';
import { matchingService } from '../../services/matchingService';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/common/Toast';
import { Users, Filter, Sparkles, Calendar, Mail, Phone } from 'lucide-react';

export const HRCandidates = () => {
  const { toast, triggerToast } = useToast();
  const [query, setQuery] = useState('');
  const [minMatch, setMinMatch] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState('2026-09-22T09:00');

  const candidates = candidateService.getCandidates({
    q: query,
    minMatch: minMatch > 0 ? minMatch : undefined,
  });

  const handleOpenInvite = (candidate) => {
    setSelectedCandidate(candidate);
    setInviteModalOpen(true);
  };

  const handleConfirmInvite = (e) => {
    e.preventDefault();
    setInviteModalOpen(false);
    triggerToast(
      `Đã gửi lời mời phỏng vấn tới ${selectedCandidate?.name}!`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Kho dữ liệu ứng viên tiềm năng
        </h1>
        <p className="text-xs text-slate-500">
          Tìm kiếm và sàng lọc hàng nghìn hồ sơ được chấm điểm tự động theo tiêu chí vị trí của doanh nghiệp.
        </p>
      </div>

      {/* Filter strip */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên ứng viên, vị trí hoặc kỹ năng..."
          className="w-full sm:flex-1"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-700 dark:text-slate-200"
          >
            <option value="0">Tất cả mức phù hợp</option>
            <option value="90">Trên 90% (Rất cao)</option>
            <option value="85">Trên 85% (Cao)</option>
            <option value="80">Trên 80% (Phù hợp)</option>
          </select>
        </div>
      </Card>

      {/* Candidate Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            onView={(cand) => setSelectedCandidate(cand)}
            onInvite={handleOpenInvite}
            onSave={(cand) =>
              triggerToast(`Đã lưu ứng viên ${cand.name} vào danh sách ngắn`, 'success')
            }
          />
        ))}
      </div>

      {/* Candidate Profile Details Modal */}
      <Modal
        isOpen={!!selectedCandidate && !inviteModalOpen}
        onClose={() => setSelectedCandidate(null)}
        title={selectedCandidate?.name}
        subtitle={`${selectedCandidate?.role} · ${selectedCandidate?.experience}`}
      >
        {selectedCandidate && (
          <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 text-emerald-600 font-bold text-lg flex items-center justify-center">
                {selectedCandidate.initials}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedCandidate.name}
                </h4>
                <p className="text-slate-500">
                  {selectedCandidate.email} · {selectedCandidate.phone}
                </p>
                <p className="text-slate-500">{selectedCandidate.location}</p>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 dark:text-white mb-1">
                Tóm tắt chuyên môn
              </h5>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {selectedCandidate.summary ||
                  'Ứng viên có bề dày kinh nghiệm thực chiến trong các dự án công nghệ, tư duy chủ động và khả năng giao tiếp phối hợp tốt.'}
              </p>
            </div>

            {/* AI Matching Breakdown */}
            <MatchBreakdown
              breakdown={
                matchingService.calculateMatch(selectedCandidate, {
                  title: selectedCandidate.role,
                  skills: selectedCandidate.skills,
                }).breakdown
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCandidate(null)}
              >
                Đóng
              </Button>
              <Button
                size="sm"
                onClick={() => setInviteModalOpen(true)}
              >
                Lên lịch phỏng vấn
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invite Interview Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={`Mời phỏng vấn: ${selectedCandidate?.name}`}
        subtitle={`Vị trí: ${selectedCandidate?.role}`}
      >
        <form onSubmit={handleConfirmInvite} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Thời gian phỏng vấn đề xuất
            </label>
            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Hình thức phỏng vấn
            </label>
            <select className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-100">
              <option>Google Meet (Trực tuyến)</option>
              <option>Trực tiếp tại văn phòng công ty</option>
              <option>Phỏng vấn qua điện thoại</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Gửi thư mời phỏng vấn
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
