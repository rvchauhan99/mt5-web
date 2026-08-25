type SessionUser = {
  id: string;
  fullName: string;
  role: string;
  permissions?: string[];
  email?: string;
  timezone?: string;
};

let accessToken: string | null = null;
let currentUser: SessionUser | null = null;

const ACCESS_TOKEN_KEY = "crickierp-access-token";
const USER_KEY = "crickierp-user";

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (!token) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getSessionUser() {
  return currentUser;
}

export function setSessionUser(user: SessionUser | null) {
  currentUser = user;
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(USER_KEY);
    return;
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function hydrateSessionStore() {
  if (typeof window === "undefined") return;
  accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!rawUser) return;
  try {
    currentUser = JSON.parse(rawUser) as SessionUser;
  } catch {
    currentUser = null;
  }
}

export function clearSessionStore() {
  setAccessToken(null);
  setSessionUser(null);
}
