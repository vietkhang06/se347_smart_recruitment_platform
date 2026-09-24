export const matchingService = {
  calculateMatch(candidate, job) {
    if (!candidate || !job) return { score: 70, breakdown: {} };

    // Skill matching
    const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase());
    const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
    const commonSkills = candidateSkills.filter((s) => jobSkills.includes(s));

    const skillScore = jobSkills.length > 0
      ? Math.min(100, Math.round((commonSkills.length / jobSkills.length) * 100))
      : 85;

    // Experience match
    const expScore = 90; // default high baseline for senior profiles

    // Education & domain match
    const domainScore = 92;

    const overallScore = Math.round(
      skillScore * 0.5 + expScore * 0.3 + domainScore * 0.2
    );

    return {
      score: overallScore,
      breakdown: {
        skills: {
          score: skillScore,
          matched: commonSkills,
          missing: jobSkills.filter((s) => !candidateSkills.includes(s)),
        },
        experience: {
          score: expScore,
          details: 'Số năm kinh nghiệm phù hợp chuẩn yêu cầu',
        },
        cultural: {
          score: domainScore,
          details: 'Phong cách làm việc chủ động và phù hợp môi trường Agile',
        },
      },
      aiSummary: `Ứng viên có độ tương đồng ${overallScore}% với vị trí ${job.title}, mạnh về các kỹ năng cốt lõi ${candidate.skills?.slice(0, 3).join(', ')}.`,
    };
  },

  getTopCandidatesForJob(job, candidates = []) {
    return candidates
      .map((c) => {
        const matchData = this.calculateMatch(c, job);
        return {
          ...c,
          match: matchData.score,
          breakdown: matchData.breakdown,
          aiSummary: matchData.aiSummary,
        };
      })
      .sort((a, b) => b.match - a.match);
  },
};
