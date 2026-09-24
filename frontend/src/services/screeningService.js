import { candidateService } from './candidateService';

export const screeningService = {
  getPipelineStages() {
    return [
      { id: 'Mới', label: 'Hồ sơ mới', color: 'blue' },
      { id: 'Sàng lọc', label: 'Đang sàng lọc', color: 'purple' },
      { id: 'Bài kiểm tra', label: 'Bài kiểm tra', color: 'amber' },
      { id: 'Phỏng vấn', label: 'Phỏng vấn', color: 'emerald' },
      { id: 'Đề nghị', label: 'Đề nghị việc làm', color: 'teal' },
    ];
  },

  getGroupedCandidates() {
    const candidates = candidateService.getCandidates();
    const stages = this.getPipelineStages();
    const grouped = {};
    stages.forEach((stage) => {
      grouped[stage.id] = candidates.filter((c) => c.stage === stage.id);
    });
    return grouped;
  },

  moveCandidateStage(candidateId, newStage) {
    const candidates = candidateService.getCandidates();
    const target = candidates.find((c) => c.id === candidateId);
    if (target) {
      target.stage = newStage;
    }
    return target;
  },

  quickScreen(candidate) {
    const passed = candidate.match >= 80;
    return {
      candidateId: candidate.id,
      passed,
      recommendation: passed ? 'Chuyển sang phỏng vấn' : 'Cần thêm bài test năng lực',
      confidence: `${candidate.match}%`,
    };
  },
};
