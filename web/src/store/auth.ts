import { create } from "zustand";

interface AuthState {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "登录失败" }));
      throw new Error(err.message || "登录失败");
    }

    const result = await res.json();
    const token = result.data.token;
    localStorage.setItem("admin_token", token);
    localStorage.setItem("admin_username", username);
    set({ token, username, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_username");
    set({ token: null, username: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem("admin_token");
    const username = localStorage.getItem("admin_username");
    if (token) {
      set({ token, username, isAuthenticated: true });
    } else {
      set({ token: null, username: null, isAuthenticated: false });
    }
  },
}));
