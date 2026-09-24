import { STORAGE_KEYS, ROLES } from '../constants';
import { getItem, setItem, removeItem } from '../utils/storage';

const DEFAULT_USERS = {
  candidate: {
    id: 'USR-CAND-01',
    name: 'Nguyễn An Khang',
    email: 'ankhang@example.com',
    role: ROLES.CANDIDATE,
    initials: 'AK',
    title: 'Senior Product Designer',
    phone: '090 123 4567',
    location: 'TP. Hồ Chí Minh',
    loggedIn: true,
  },
  employer: {
    id: 'USR-EMP-01',
    name: 'Nguyễn Lan Anh',
    email: 'lananh@fpt.com',
    role: ROLES.EMPLOYER,
    initials: 'LA',
    title: 'Talent Acquisition Lead',
    company: 'FPT Digital Talent',
    phone: '090 987 6543',
    location: 'TP. Hồ Chí Minh',
    loggedIn: true,
  },
  admin: {
    id: 'USR-ADM-01',
    name: 'Hà Minh Đức',
    email: 'admin@matchajob.vn',
    role: ROLES.ADMIN,
    initials: 'AD',
    title: 'Platform Administrator',
    loggedIn: true,
  },
};

export const authService = {
  getCurrentUser() {
    const user = getItem(STORAGE_KEYS.DEMO_USER);
    if (user && user.loggedIn) {
      return user;
    }
    return null;
  },

  login(email, password, role = ROLES.CANDIDATE) {
    const template = DEFAULT_USERS[role] || DEFAULT_USERS.candidate;
    const user = {
      ...template,
      email: email || template.email,
      role,
      loggedIn: true,
    };
    setItem(STORAGE_KEYS.DEMO_USER, user);
    return user;
  },

  register(data) {
    const role = data.role || ROLES.CANDIDATE;
    const initials = data.name
      ? data.name
          .split(' ')
          .map((n) => n[0])
          .slice(-2)
          .join('')
          .toUpperCase()
      : 'MJ';

    const user = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: data.name,
      email: data.email,
      role,
      company: data.company || '',
      initials,
      loggedIn: true,
    };
    setItem(STORAGE_KEYS.DEMO_USER, user);
    return user;
  },

  logout() {
    removeItem(STORAGE_KEYS.DEMO_USER);
  },

  switchRole(role) {
    const template = DEFAULT_USERS[role] || DEFAULT_USERS.candidate;
    setItem(STORAGE_KEYS.DEMO_USER, template);
    return template;
  },
};
