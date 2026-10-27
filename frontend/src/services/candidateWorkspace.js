import { storage } from "./storage";
import { mockStore } from "./mockStore";

const normalize = (value) => String(value || "").trim().toLowerCase();

export function candidateEmail() {
  const user = storage.getUser();
  return user?.role === "candidate" ? normalize(user.email) : "";
}

function requireCandidate() {
  const email = candidateEmail();
  if (!email) throw new Error("Hãy đăng nhập bằng tài khoản ứng viên.");
  return email;
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function getProfile() {
  const email = candidateEmail();
  const blank = {
    name: storage.getUser()?.name || "",
    role: "",
    email,
    phone: "",
    experience: "",
    location: "",
    bio: "",
    skills: []
  };

  if (!email) return blank;

  const legacy = storage.getCandidateProfile();
  const fallback = normalize(legacy?.email) === email ? legacy : {};

  return {
    ...blank,
    ...read(`candidate-profile:${email}`, fallback),
    email
  };
}

export function saveProfile(profile) {
  const email = requireCandidate();

  localStorage.setItem(
    `candidate-profile:${email}`,
    JSON.stringify({ ...profile, email })
  );

  window.dispatchEvent(new Event("matchajob:store-changed"));
}

export function ownApplications() {
  const email = candidateEmail();
  if (!email) return [];

  const ids = new Set(
    mockStore.getCandidates()
      .filter(candidate => normalize(candidate.email) === email)
      .map(candidate => String(candidate.id))
  );

  return mockStore.getApplications().filter(app =>
    app.candidateEmail
      ? normalize(app.candidateEmail) === email
      : ids.has(String(app.candidateId))
  );
}

export function subscribeCandidate(callback) {
  window.addEventListener("matchajob:store-changed", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("matchajob:store-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function draft(jobId, value) {
  const key = `candidate-draft:${requireCandidate()}:${jobId}`;

  if (value === undefined) return read(key, null);

  if (value === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// IndexedDB lưu nội dung tệp CV.
function cvStore(mode, action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("matchajob-candidate-cv", 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore("files", { keyPath: "id" });
    };

    request.onerror = () => {
      reject(new Error(
        "Không mở được kho CV. Kiểm tra quyền lưu trữ của trình duyệt."
      ));
    };

    request.onblocked = () => {
      reject(new Error("Hãy đóng tab MatchaJob cũ rồi thử lại."));
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction("files", mode);
      const result = action(transaction.objectStore("files"));

      transaction.oncomplete = () => {
        db.close();
        resolve(result.result);
      };

      transaction.onabort = transaction.onerror = () => {
        db.close();
        reject(new Error(
          "Không lưu/đọc được CV. Bộ nhớ trình duyệt có thể đã đầy."
        ));
      };
    };
  });
}

export async function uploadCV(file) {
  const owner = requireCandidate();

  if (
    !/\.(pdf|doc|docx)$/i.test(file.name) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new Error(
      "Chọn PDF, DOC hoặc DOCX, dung lượng từ 1 byte đến 5 MB."
    );
  }

  const id = crypto.randomUUID();

  await cvStore("readwrite", store => store.put({
    id,
    owner,
    file
  }));

  return {
    cvId: id,
    cvName: file.name,
    cvSize: file.size
  };
}

async function readCV(id) {
  const owner = requireCandidate();
  const item = id && await cvStore(
    "readonly",
    store => store.get(id)
  );

  if (!item || item.owner !== owner) {
    throw new Error(
      "Không tìm thấy nội dung CV của bạn. Hãy chọn lại tệp."
    );
  }

  return item.file;
}

export async function downloadCV(id) {
  const file = await readCV(id);
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.name;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function submitApplication(jobId, profile, coverLetter) {
  const email = requireCandidate();

  if (
    !profile.name?.trim() ||
    !/^[+\d][\d\s().-]{7,19}$/.test(profile.phone?.trim() || "")
  ) {
    throw new Error(
      "Nhập họ tên và số điện thoại hợp lệ (8–20 ký tự)."
    );
  }

  await readCV(profile.cvId);

  if (requireCandidate() !== email) {
    throw new Error(
      "Tài khoản đã thay đổi. Hãy mở lại form ứng tuyển."
    );
  }

  const snapshot = {
    ...profile,
    name: profile.name.trim(),
    email,
    phone: profile.phone.trim()
  };

  const keys = [
    "matchajob_store_applications",
    "matchajob_store_candidates",
    "matchajob_store_jobs"
  ];

  const before = keys.map(key => localStorage.getItem(key));
  let app;

  try {
    app = mockStore.applyForJob({
      jobId,
      candidateName: snapshot.name,
      candidateEmail: email,
      candidatePhone: snapshot.phone,
      coverLetter: coverLetter.trim(),
      profileSnapshot: snapshot
    });

    const savedApp = mockStore.getApplications()
      .some(item => item.id === app.id);

    const savedCandidate = mockStore.getCandidates()
      .some(item => item.id === app.candidateId);

    if (!savedApp || !savedCandidate) {
      throw new Error(
        "Không lưu đủ dữ liệu. Kiểm tra dung lượng trình duyệt rồi gửi lại."
      );
    }
  } catch (error) {
    keys.forEach((key, index) => {
      try {
        if (before[index] === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, before[index]);
        }
      } catch {
        // Giữ lỗi gốc để hiển thị cho người dùng.
      }
    });

    window.dispatchEvent(new Event("matchajob:store-changed"));
    throw error;
  }

  try {
    draft(jobId, null);
  } catch {
    // Đơn đã gửi thành công; lỗi xóa nháp không làm mất đơn.
  }

  return app;
}