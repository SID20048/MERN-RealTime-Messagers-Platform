/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "@/lib/axios-client";
import type { LoginType, RegisterType, UserType } from "@/types/auth.type";
import { toast } from "sonner";
import { create } from "zustand";
//import { persist } from "zustand/middleware";
import { useSocket } from "./use-socket";

interface AuthState {
  user: UserType | null;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  isAuthStatusLoading: boolean;

  register: (data: RegisterType) => void;
  login: (data: LoginType) => void;
  logout: () => void;
  isAuthStatus: () => void;
}

//Without Persist
export const useAuth = create<AuthState>()((set) => ({
  user: null,
  isSigningUp: false,
  isLoggingIn: false,
  isAuthStatusLoading: false,

  register: async (data: RegisterType) => {
    set({ isSigningUp: true });
    try {
      const response = await API.post("/auth/register", data);
      const token = response.data?.token;

      // 1. Save the registration token fallback string to storage
      if (token) {
        localStorage.setItem("token", token);
      }

      set({ user: response.data.user });
      
      // 2. FIXED: Wrapped in setTimeout to resolve microtask state race conditions
      setTimeout(() => {
        useSocket.getState().connectSocket(token);
      }, 50);

      toast.success("Register successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Register failed");
    } finally {
      set({ isSigningUp: false });
    }
  },
  login: async (data: LoginType) => {
    set({ isLoggingIn: true });
    console.log("login axios called");
    try {
      const response = await API.post("/auth/login", data);
      const token = response.data?.token;

      // 3. Save the login token fallback string to storage
      if (token) {
        localStorage.setItem("token", token);
      }

      set({ user: response.data.user });

      // 4. FIXED: Wrapped in setTimeout to let localStorage settle securely
      setTimeout(() => {
        useSocket.getState().connectSocket(token);
      }, 50);

      toast.success("Login successfully");
    } catch (err: any) {
      console.log("login axios error", err);
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },
  logout: async () => {
    try {
      await API.post("/auth/logout");
      set({ user: null });
      
      // 5. Purge the token on user logout
      localStorage.removeItem("token");
      
      useSocket.getState().disconnectSocket();
      toast.success("Logout successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Logout failed");
    }
  },
  isAuthStatus: async () => {
    set({ isAuthStatusLoading: true });
    try {
      const response = await API.get("/auth/status");
      const token = response.data?.token;

      // 6. Save the persistence token if refreshed or re-authenticated
      if (token) {
        localStorage.setItem("token", token);
      }

      set({ user: response.data.user });

      // 7. FIXED: Wrapped in setTimeout to sync active state restoration hooks
      setTimeout(() => {
        useSocket.getState().connectSocket(token);
      }, 50);

    } catch (err: any) {
      // Clear token locally if validation fails on the backend status check
      localStorage.removeItem("token");
      toast.error(err.response?.data?.message || "Authentication failed");
      console.log(err);
    } finally {
      set({ isAuthStatusLoading: false });
    }
  },
}));
