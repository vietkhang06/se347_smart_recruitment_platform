import { mockStore } from "./mockStore";
import { ownApplications } from "./candidateWorkspace";
export { ownApplications, draft, submitApplication, subscribeCandidate } from "./candidateWorkspace";
export { interviewTime, interviewClosed, safeMeetingLink } from "./mockStore";

export const applicationService = {
  getInterviews() {
    const applications = ownApplications();
    return mockStore.getInterviews().filter(interview => applications.some(app =>
      String(app.candidateId) === String(interview.candidateId) &&
      String(app.jobId) === String(interview.jobId)
    ));
  },
  getCandidateNotifications: () => mockStore.getCandidateNotifications(),
  markCandidateNotificationsRead: () => mockStore.markCandidateNotificationsRead(),
  withdrawApplication: (id, reason) => mockStore.withdrawApplication(id, reason),
  respondInterview: (id, action, note, version) => mockStore.respondInterview(id, action, note, version),
  canWithdraw: (application) => mockStore.canWithdraw(application)
};
