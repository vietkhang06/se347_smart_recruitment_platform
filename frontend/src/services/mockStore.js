import { changeAdminUserStatus, normalizeEmail } from "./adminUsers";
import { mockStore as base } from "./mockStoreBase";

const K = {
  apps: "matchajob_store_applications",
  candidates: "matchajob_store_candidates",
  interviews: "matchajob_store_interviews",
  notices: "matchajob_candidate_notifications_v1",
  logs: "matchajob_store_logs"
};

const same = (a, b) =>
  a != null && b != null && String(a) === String(b);

const norm = value =>
  String(value || "").trim().toLowerCase();

const terminal = value =>
  /đã rút|từ chối|không phù hợp/i.test(value || "");

export const interviewClosed = item =>
  /hủy|hoàn tất|hoàn thành/i.test(item?.status || "");

const now = () => new Date().toISOString();

function read(key, fallback) {
  const raw = localStorage.getItem(key);

  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "Dữ liệu lưu bị lỗi. Không xóa bộ nhớ; hãy báo lại để kiểm tra."
    );
  }
}

function session(role) {
  const user = read("matchajob-demo-user", null);

  if (!user?.email || user.role !== role) {
    throw new Error(
      "Phiên đăng nhập đã đổi. Hãy đăng nhập đúng vai trò."
    );
  }

  const account = base.getUsers().find(u =>
    [u.email, u.personalEmail].some(
      email => email && norm(email) === norm(user.email)
    )
  );

  if (
    account &&
    /khóa|đình chỉ/i.test(account.status || "")
  ) {
    throw new Error("Tài khoản đã bị khóa.");
  }

  return { user, account };
}

function companyId() {
  const { account } = session("employer");

  if (
    account?.role !== "Nhà tuyển dụng" ||
    !account.companyId
  ) {
    throw new Error(
      "Email HR chưa được gắn với doanh nghiệp. Hãy dùng tài khoản HR đã có trong Quản lý người dùng."
    );
  }

  if (!base.getCompanies().some(item => same(item.id, account.companyId))) {
    throw new Error("Doanh nghiệp của tài khoản không còn tồn tại.");
  }
  return account.companyId;
}

function companyOf(item) {
  return (
    item.companyId ||
    base.getJobs().find(job =>
      same(job.id, item.jobId || item.appliedJobId)
    )?.companyId
  );
}

function candidateFor(id) {
  const candidate = base.getCandidates().find(
    item => same(item.id, id)
  );

  if (!candidate) {
    throw new Error("Không tìm thấy hồ sơ ứng viên.");
  }

  return candidate;
}

function requireHR(candidate) {
  if (!same(companyOf(candidate), companyId())) {
    throw new Error(
      "Bạn chỉ được xử lý hồ sơ của doanh nghiệp mình."
    );
  }
}

function editable(candidate) {
  if (
    candidate.withdrawnAt ||
    terminal(candidate.stage)
  ) {
    throw new Error(
      "Hồ sơ đã rút hoặc bị từ chối, không thể tiếp tục xử lý."
    );
  }
}

const matches = (app, item) =>
  same(app.candidateId, item.candidateId) &&
  same(app.jobId, item.jobId);

const applicationFor = item =>
  base.getApplications().find(app => matches(app, item));

const emailOf = app =>
  norm(
    app.candidateEmail ||
    base.getCandidates().find(candidate =>
      same(candidate.id, app.candidateId)
    )?.email
  );

function owned(app) {
  if (
    !app ||
    emailOf(app) !== norm(session("candidate").user.email)
  ) {
    throw new Error(
      "Không tìm thấy đơn thuộc tài khoản của bạn."
    );
  }
}

function notice(app, text) {
  return {
    id: crypto.randomUUID(),
    email: emailOf(app),
    applicationId: app.id,
    text,
    createdAt: now(),
    read: false
  };
}

function history(item, text) {
  return [
    ...(item.history || []),
    { at: now(), text }
  ];
}

function commit(
  changes,
  notices = [],
  action = "RECRUITMENT_UPDATE"
) {
  if (notices.length) {
    changes[K.notices] = [
      ...notices.filter(item => item.email),
      ...read(K.notices, [])
    ];
  }

  if (
    Object.keys(changes).some(key => key !== K.notices)
  ) {
    changes[K.logs] = [
      {
        time: new Date().toLocaleString("vi-VN"),
        actor: read("matchajob-demo-user", {})?.email || "",
        action,
        target: notices[0]?.text || action,
        ip: "",
        status: "Thành công"
      },
      ...base.getAuditLogs()
    ];
  }

  const before = Object.keys(changes).map(key => [
    key,
    localStorage.getItem(key)
  ]);

  try {
    Object.entries(changes).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  } catch {
    before.forEach(([key, value]) => {
      try {
        if (value === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, value);
        }
      } catch {
        // Hiển thị lỗi lưu dữ liệu bên dưới.
      }
    });

    throw new Error(
      "Không lưu được thay đổi. Kiểm tra dung lượng trình duyệt."
    );
  }

  window.dispatchEvent(
    new Event("matchajob:store-changed")
  );
}

export function interviewTime(item) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    item?.date || ""
  );

  const time = /^(\d{2}):(\d{2})$/.exec(
    item?.time || ""
  );

  if (!date || !time) return NaN;

  const [, year, month, day] = date.map(Number);

  const check = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    Number(time[1]) > 23 ||
    Number(time[2]) > 59
  ) {
    return NaN;
  }

  return Date.parse(
    `${item.date}T${item.time}:00+07:00`
  );
}

export function safeMeetingLink(value) {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function validateSchedule(item) {
  const time = interviewTime(item);

  if (!Number.isFinite(time) || time <= Date.now()) {
    throw new Error(
      "Chọn ngày, giờ hợp lệ trong tương lai (giờ Việt Nam)."
    );
  }

  if (
    item.meetingLink &&
    !safeMeetingLink(item.meetingLink)
  ) {
    throw new Error(
      "Link họp phải là địa chỉ http:// hoặc https:// hợp lệ."
    );
  }

  if (
    /Meet|Teams|trực tuyến/i.test(item.type || "") &&
    !item.meetingLink
  ) {
    throw new Error(
      "Lịch trực tuyến cần có link phòng họp."
    );
  }

  if (
    /trực tiếp|điện thoại/i.test(item.type || "") &&
    !String(item.note || "").trim()
  ) {
    throw new Error(
      "Nhập địa điểm gặp mặt hoặc hướng dẫn gọi điện trong ghi chú."
    );
  }
}

function checkCollision(next) {
  const candidate = candidateFor(next.candidateId);

  const conflict = base.getInterviews().some(item => {
    const other = base.getCandidates().find(
      value => same(value.id, item.candidateId)
    );

    const samePerson =
      same(item.candidateId, candidate.id) ||
      (
        candidate.email &&
        other?.email &&
        norm(candidate.email) === norm(other.email)
      );

    return (
      !same(item.id, next.id) &&
      !interviewClosed(item) &&
      samePerson &&
      interviewTime(item) === interviewTime(next)
    );
  });

  if (conflict) {
    throw new Error(
      "Ứng viên đã có lịch bắt đầu vào thời điểm này. Hãy chọn giờ khác."
    );
  }
}

function getInterview(id) {
  const item = base.getInterviews().find(
    interview => same(interview.id, id)
  );

  if (!item) {
    throw new Error(
      "Lịch phỏng vấn không còn tồn tại."
    );
  }

  requireHR({
    ...item,
    companyId: companyOf(item)
  });

  return item;
}

function updateStage(id, stage, reason = "") {
  const candidate = candidateFor(id);

  requireHR(candidate);
  editable(candidate);

  const allowed = [
    "Mới",
    "Sàng lọc",
    "Bài kiểm tra",
    "Phỏng vấn",
    "Đề nghị",
    "Đã từ chối",
    "Không phù hợp"
  ];

  if (!allowed.includes(stage)) {
    throw new Error("Giai đoạn không hợp lệ.");
  }

  const reject = terminal(stage);
  reason = String(reason).trim();

  if (reject && !reason) {
    throw new Error("Nhập lý do từ chối hồ sơ.");
  }

  if (reason.length > 1000) {
    throw new Error("Lý do tối đa 1000 ký tự.");
  }

  if (candidate.stage === stage && !reject) return;

  const apps = base.getApplications();

  const affected = app =>
    matches(app, {
      candidateId: candidate.id,
      jobId: candidate.appliedJobId
    }) &&
    !app.withdrawnAt;

  const text = reject
    ? `Không phù hợp. Lý do: ${reason}`
    : `Trạng thái hồ sơ: ${stage}`;

  const steps = {
    "Mới": 1,
    "Sàng lọc": 2,
    "Bài kiểm tra": 2,
    "Phỏng vấn": 3,
    "Đề nghị": 4
  };

  const changes = {
    [K.candidates]: base.getCandidates().map(item =>
      same(item.id, id)
        ? {
            ...item,
            stage: reject ? "Đã từ chối" : stage,
            rejectReason: reject ? reason : ""
          }
        : item
    ),

    [K.apps]: apps.map(app =>
      affected(app)
        ? {
            ...app,
            stage: reject ? "Không phù hợp" : stage,
            step: steps[stage] || app.step,
            rejectReason: reject ? reason : "",
            history: history(app, text)
          }
        : app
    )
  };

  if (reject) {
    changes[K.interviews] = base.getInterviews().map(
      interview =>
        same(interview.candidateId, id) &&
        same(
          interview.jobId,
          candidate.appliedJobId
        ) &&
        !interviewClosed(interview)
          ? {
              ...interview,
              status: "Đã hủy",
              cancelReason: reason
            }
          : interview
    );
  }

  commit(
    changes,
    apps.filter(affected).map(app =>
      notice(app, `${app.title}: ${text}`)
    )
  );
}

// Hàm cũ vẫn thao tác trên toàn bộ kho dữ liệu gốc.
// Không ghi đè kho bằng danh sách đã lọc theo HR.
const inherited = Object.fromEntries(
  Object.entries(base).map(([key, value]) => [
    key,
    typeof value === "function"
      ? value.bind(base)
      : value
  ])
);

export const mockStore = {
  ...inherited,

  getHRCompanyId: companyId,

  setUserStatus: setAdminStatus,
  deleteUser: deleteAdminUser,

  getEmployerJobs(id) {
    if (
      read("matchajob-demo-user", null)?.role !==
      "employer"
    ) {
      return base.getEmployerJobs(id);
    }

    try {
      return base.getEmployerJobs(companyId());
    } catch {
      return [];
    }
  },

  saveJob(data) {
    const id = companyId();

    return base.saveJob({
      ...data,
      companyId: id
    });
  },

  getCandidates() {
    if (
      read("matchajob-demo-user", null)?.role !==
      "employer"
    ) {
      return base.getCandidates();
    }

    try {
      const id = companyId();

      return base.getCandidates().filter(candidate =>
        same(companyOf(candidate), id)
      );
    } catch {
      return [];
    }
  },

  getCandidateById(id) {
    return this.getCandidates().find(
      candidate => same(candidate.id, id)
    );
  },

  getInterviews() {
    if (
      read("matchajob-demo-user", null)?.role !==
      "employer"
    ) {
      return base.getInterviews();
    }

    try {
      const id = companyId();

      return base.getInterviews().filter(interview =>
        same(companyOf(interview), id)
      );
    } catch {
      return [];
    }
  },

  updateCandidateStage: updateStage,

  rejectCandidate(id, reason) {
    updateStage(id, "Đã từ chối", reason);
  },

  canWithdraw(app) {
    return Boolean(
      app &&
      !app.withdrawnAt &&
      !terminal(app.stage) &&
      app.stage !== "Đề nghị"
    );
  },

  withdrawApplication(id, reason = "") {
    const apps = base.getApplications();
    const app = apps.find(item => same(item.id, id));

    owned(app);

    if (!this.canWithdraw(app)) {
      throw new Error(
        "Đơn không còn ở giai đoạn cho phép rút."
      );
    }

    reason = String(reason).trim();

    if (reason.length > 1000) {
      throw new Error("Ghi chú tối đa 1000 ký tự.");
    }

    const patch = {
      stage: "Đã rút",
      withdrawnAt: now(),
      withdrawReason: reason
    };

    commit(
      {
        [K.apps]: apps.map(item =>
          same(item.id, id)
            ? {
                ...item,
                ...patch,
                history: history(
                  item,
                  "Ứng viên rút đơn"
                )
              }
            : item
        ),

        [K.candidates]: base.getCandidates().map(
          candidate =>
            same(candidate.id, app.candidateId) &&
            same(
              candidate.appliedJobId,
              app.jobId
            )
              ? { ...candidate, ...patch }
              : candidate
        ),

        [K.interviews]: base.getInterviews().map(
          interview =>
            matches(app, interview) &&
            !interviewClosed(interview)
              ? {
                  ...interview,
                  status: "Đã hủy",
                  cancelReason: "Ứng viên đã rút đơn"
                }
              : interview
        )
      },
      [
        notice(
          app,
          `Bạn đã rút đơn ${app.title}. Lịch chưa hoàn tất của đơn này đã được hủy.`
        )
      ]
    );
  },

  getCandidateNotifications() {
    const email = norm(
      session("candidate").user.email
    );

    return read(K.notices, []).filter(
      item => norm(item.email) === email
    );
  },

  markCandidateNotificationsRead() {
    const email = norm(
      session("candidate").user.email
    );

    commit({
      [K.notices]: read(K.notices, []).map(item =>
        norm(item.email) === email
          ? { ...item, read: true }
          : item
      )
    });
  },

  createInterview(data) {
    const candidate = candidateFor(data.candidateId);

    requireHR(candidate);
    editable(candidate);

    const item = {
      id: `INT-${crypto.randomUUID()}`,
      candidateId: candidate.id,
      candidate: candidate.name || candidate.candidateName || "Ứng viên",
      jobId: candidate.appliedJobId,
      companyId: companyOf(candidate),
      role:
        candidate.appliedJobTitle ||
        candidate.role || candidate.candidateRole,
      date: data.date,
      time: data.time,
      type: data.type,
      people: String(data.people || "").trim(),
      note: String(data.note || "").trim(),
      meetingLink: String(
        data.meetingLink || ""
      ).trim(),
      status: "Chờ xác nhận",
      scheduleVersion: 1,
      candidateResponse: null
    };

    validateSchedule(item);
    checkCollision(item);

    const app = applicationFor(item);

    commit(
      {
        [K.interviews]: [
          item,
          ...base.getInterviews()
        ],

        [K.candidates]: base.getCandidates().map(
          value =>
            same(value.id, candidate.id)
              ? { ...value, stage: "Phỏng vấn" }
              : value
        ),

        [K.apps]: base.getApplications().map(value =>
          app && same(value.id, app.id)
            ? {
                ...value,
                stage: "Phỏng vấn",
                step: 3,
                history: history(
                  value,
                  "HR tạo lịch phỏng vấn"
                )
              }
            : value
        )
      },
      app
        ? [
            notice(
              app,
              `${app.title}: lịch mới ${item.date} ${item.time} (giờ Việt Nam). Vui lòng xác nhận.`
            )
          ]
        : []
    );

    return item;
  },

  updateInterview(id, updates, expectedVersion) {
    const current = getInterview(id);

    if (interviewClosed(current)) {
      throw new Error(
        "Lịch đã hủy hoặc hoàn tất, không thể chỉnh sửa."
      );
    }

    editable(candidateFor(current.candidateId));

    if (
      expectedVersion != null &&
      Number(expectedVersion) !==
        Number(current.scheduleVersion || 1)
    ) {
      throw new Error(
        "Lịch vừa thay đổi. Hãy đóng và mở lại để kiểm tra."
      );
    }

    if (
      updates.status &&
      updates.status !== "Hoàn tất"
    ) {
      throw new Error(
        "Chỉ ứng viên được xác nhận tham gia. Hủy lịch bằng nút Hủy lịch."
      );
    }

    const allowed = [
      "date",
      "time",
      "type",
      "people",
      "meetingLink",
      "note"
    ];

    const patch = Object.fromEntries(
      allowed
        .filter(key => key in updates)
        .map(key => [
          key,
          String(updates[key] || "").trim()
        ])
    );

    const changed = allowed.some(
      key =>
        key in patch &&
        patch[key] !== String(current[key] || "")
    );

    if (!changed && !updates.status) return current;

    if (updates.status && changed) {
      throw new Error(
        "Lưu lịch mới trước khi cập nhật kết quả."
      );
    }

    let next = { ...current, ...patch };

    if (updates.status === "Hoàn tất") {
      if (
        !Number.isFinite(interviewTime(current)) ||
        interviewTime(current) > Date.now()
      ) {
        throw new Error(
          "Chỉ đánh dấu hoàn tất sau giờ bắt đầu của lịch hợp lệ."
        );
      }

      next.status = "Hoàn tất";
    } else {
      validateSchedule(next);
      checkCollision(next);

      next = {
        ...next,
        status: "Chờ xác nhận",
        scheduleVersion:
          Number(current.scheduleVersion || 1) + 1,
        candidateResponse: null,
        responseHistory: [
          ...(current.responseHistory || []),
          ...(current.candidateResponse
            ? [current.candidateResponse]
            : [])
        ]
      };
    }

    const app = applicationFor(next);

    commit(
      {
        [K.interviews]: base.getInterviews().map(
          item => same(item.id, id) ? next : item
        )
      },
      app
        ? [
            notice(
              app,
              changed
                ? `${app.title}: HR cập nhật lịch ${next.date} ${next.time}. Vui lòng xác nhận lại.`
                : `${app.title}: buổi phỏng vấn đã hoàn tất.`
            )
          ]
        : []
    );

    return next;
  },

  cancelInterview(
    id,
    reason = "Nhà tuyển dụng hủy lịch"
  ) {
    const item = getInterview(id);

    if (interviewClosed(item)) {
      throw new Error("Lịch đã hủy hoặc hoàn tất.");
    }

    const app = applicationFor(item);

    commit(
      {
        [K.interviews]: base.getInterviews().map(
          interview =>
            same(interview.id, id)
              ? {
                  ...interview,
                  status: "Đã hủy",
                  cancelReason:
                    String(reason).trim() ||
                    "Nhà tuyển dụng hủy lịch"
                }
              : interview
        )
      },
      app
        ? [
            notice(
              app,
              `${app.title}: HR hủy lịch ${item.date} ${item.time}. ${reason}`
            )
          ]
        : []
    );
  },

  respondInterview(
    id,
    type,
    note = "",
    expectedVersion
  ) {
    const list = base.getInterviews();
    const item = list.find(
      interview => same(interview.id, id)
    );

    if (!item) {
      throw new Error("Lịch không còn tồn tại.");
    }

    const app = applicationFor(item);
    owned(app);

    if (
      terminal(app.stage) ||
      app.withdrawnAt ||
      interviewClosed(item) ||
      !Number.isFinite(interviewTime(item)) ||
      interviewTime(item) <= Date.now()
    ) {
      throw new Error(
        "Không thể phản hồi lịch đã qua, đã hủy hoặc đơn đã kết thúc."
      );
    }

    if (
      Number(expectedVersion) !==
      Number(item.scheduleVersion || 1)
    ) {
      throw new Error(
        "HR vừa đổi lịch. Hãy đóng và mở lại để xem lịch mới."
      );
    }

    if (!["confirmed", "reschedule"].includes(type)) {
      throw new Error("Phản hồi không hợp lệ.");
    }

    note = String(note).trim();

    if (
      (type === "reschedule" && !note) ||
      note.length > 1000
    ) {
      throw new Error(
        "Đề nghị đổi lịch cần lý do; ghi chú tối đa 1000 ký tự."
      );
    }

    if (
      item.candidateResponse?.type === type &&
      item.candidateResponse?.note === note
    ) {
      return;
    }

    const response = {
      type,
      note,
      at: now(),
      version: Number(item.scheduleVersion || 1)
    };

    commit({
      [K.interviews]: list.map(interview =>
        same(interview.id, id)
          ? {
              ...interview,
              status:
                type === "confirmed"
                  ? "Đã xác nhận"
                  : "Đề nghị đổi lịch",
              candidateResponse: response,
              responseHistory: [
                ...(interview.responseHistory || []),
                ...(interview.candidateResponse
                  ? [interview.candidateResponse]
                  : [])
              ]
            }
          : interview
      )
    });
  },

  async downloadSubmittedCV(id) {
    const candidate = candidateFor(id);

    requireHR(candidate);

    const email = norm(
      session("employer").user.email
    );

    const app = applicationFor({
      candidateId: candidate.id,
      jobId: candidate.appliedJobId
    });

    if (!app?.cvId || app.withdrawnAt) {
      throw new Error(
        "Đơn đã rút hoặc chưa có tệp CV."
      );
    }

    const record = await new Promise(
      (resolve, reject) => {
        const request = indexedDB.open(
          "matchajob-candidate-cv",
          1
        );

        request.onupgradeneeded = () => {
          if (
            !request.result.objectStoreNames.contains(
              "files"
            )
          ) {
            request.result.createObjectStore("files", {
              keyPath: "id"
            });
          }
        };

        request.onerror = request.onblocked = () => {
          reject(new Error("Không mở được kho CV."));
        };

        request.onsuccess = () => {
          const db = request.result;

          const transaction = db.transaction(
            "files",
            "readonly"
          );

          const get = transaction
            .objectStore("files")
            .get(app.cvId);

          transaction.oncomplete = () => {
            db.close();
            resolve(get.result);
          };

          transaction.onerror =
            transaction.onabort = () => {
              db.close();
              reject(new Error("Không đọc được CV."));
            };
        };
      }
    );

    requireHR(candidateFor(id));

    if (
      norm(session("employer").user.email) !== email ||
      applicationFor({
        candidateId: candidate.id,
        jobId: candidate.appliedJobId
      })?.withdrawnAt
    ) {
      throw new Error(
        "Phiên đăng nhập hoặc hồ sơ vừa thay đổi."
      );
    }

    if (
      !record?.file ||
      norm(record.owner) !== emailOf(app)
    ) {
      throw new Error(
        "Không tìm thấy đúng tệp CV trong trình duyệt này."
      );
    }

    const url = URL.createObjectURL(record.file);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      app.cvName || record.file.name || "CV";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(
      () => URL.revokeObjectURL(url),
      60000
    );
  }
};

function requireAdmin() {
  const { user } = session("admin");
  if (user?.role !== 'admin') throw new Error('Hãy đăng nhập bằng tài khoản quản trị.');
  return user;
}
export async function copyAdminText(value) {
  if (!navigator.clipboard?.writeText) throw new Error('Trình duyệt chưa cho phép sao chép.');
  await navigator.clipboard.writeText(String(value ?? ''));
}
export function setAdminStatus(id, target) {
  requireAdmin();
  const user = mockStore.getUsers().find(u => same(u.id, id));
  if (!user) throw new Error('Tài khoản không còn tồn tại.');
  if (user.status === target || (target === 'Hoạt động' && user.status === 'Đã xác minh')) return user;
  if (!['Hoạt động', 'Tạm khóa'].includes(target)) throw new Error('Trạng thái không hợp lệ.');
  return changeAdminUserStatus(user.id, user.status);
}
export function deleteAdminUser(id) {
  const actor = requireAdmin();
  const users = base.getUsers();
  const user = users.find(item => same(item.id, id));
  if (!user) throw new Error("Tài khoản không còn tồn tại.");
  const emails = [user.email, user.personalEmail].filter(Boolean).map(normalizeEmail);
  if (emails.includes(normalizeEmail(actor.email))) throw new Error("Không thể xóa tài khoản đang đăng nhập.");
  if (["Quản trị viên", "admin"].includes(user.role) || user.roleCode === "admin") {
    throw new Error("Hãy tạm khóa tài khoản quản trị thay vì xóa để bảo toàn lịch sử.");
  }
  const linked = user.companyId || base.getCandidates().some(c => same(c.userId, id) || emails.includes(normalizeEmail(c.email || c.candidateEmail))) || base.getApplications().some(a => same(a.userId, id) || emails.includes(normalizeEmail(a.candidateEmail)));
  if (linked) throw new Error("Tài khoản đã liên kết doanh nghiệp hoặc hồ sơ ứng tuyển. Hãy tạm khóa thay vì xóa.");
  commit({ matchajob_store_users: users.filter(item => !same(item.id, id)) }, [], `DELETE_USER: ${id}`);
}

export function resolveAdminReport(id, action, note) {
  requireAdmin();
  const reports = base.getReports();
  const report = reports.find(item => same(item.id, id));
  if (!report || report.status === "Đã xử lý") throw new Error("Báo cáo đã xử lý hoặc không còn tồn tại.");
  note = String(note || "").trim();
  if (!note || note.length > 2000) throw new Error("Ghi chú cần từ 1 đến 2000 ký tự.");
  const labels = { record: "Đã ghi nhận kết quả đối soát", dismiss: "Đã bác bỏ báo cáo", close_job: "Đã đóng tin tuyển dụng liên quan" };
  if (!Object.hasOwn(labels, action)) throw new Error("Hành động không hợp lệ.");
  const saved = { ...report, status: "Đã xử lý", resolution: labels[action], action, note, resolvedAt: new Date().toLocaleString("vi-VN") };
  const changes = { matchajob_store_reports: reports.map(item => same(item.id, id) ? saved : item) };
  if (action === "close_job") {
    const jobs = base.getJobs();
    if (!report.jobId || !jobs.some(job => same(job.id, report.jobId))) throw new Error("Không tìm thấy tin tuyển dụng liên quan.");
    changes.matchajob_store_jobs = jobs.map(job => same(job.id, report.jobId) ? { ...job, status: "Đã đóng", note: `Đã đóng do báo cáo ${id}` } : job);
  }
  commit(changes, [], `RESOLVE_REPORT: ${id} (${action})`);
  return saved;
}

// Each row reports its own outcome; successful rows are not falsely rolled back in the UI.
export function runAdminBatch(ids, action) {
  const failed = []; let succeeded = 0;
  for (const id of ids) {
    try { action(id); succeeded++; } catch (error) { failed.push({ id, message: error?.message || "Không thể thực hiện thao tác." }); }
  }
  return { succeeded, failed };
}