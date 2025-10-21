"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, AuthState } from "../types";
import api from "../lib/api/client";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'student' | 'teacher') => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Call the /api/auth/me endpoint to get current user
      const response = await api.auth.me();
      
      if (response.user) {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role.toLowerCase() as 'student' | 'teacher' | 'admin',
          createdAt: new Date(response.user.createdAt),
        };
        
        setAuthState({
          user,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      // Call the backend API for login
      const response = await api.auth.login(email, password);
      
      if (response.user) {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role.toLowerCase() as 'student' | 'teacher' | 'admin',
          createdAt: new Date(response.user.createdAt),
        };

        setAuthState({
          user,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        throw new Error("Login failed. No user data returned.");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw new Error(error instanceof Error ? error.message : "Login failed. Please check your credentials.");
    }
  };

  const register = async (name: string, email: string, password: string, role: 'student' | 'teacher') => {
    try {
      // Call the backend API for registration
      const response = await api.auth.register(name, email, password, role.toUpperCase());
      
      if (response.user) {
        const user: User = {
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          role: response.user.role.toLowerCase() as 'student' | 'teacher' | 'admin',
          createdAt: new Date(response.user.createdAt),
        };

        setAuthState({
          user,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        throw new Error("Registration failed. No user data returned.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw new Error(error instanceof Error ? error.message : "Registration failed. Please try again.");
    }
  };

  const logout = async () => {
    try {
      // Call the backend API for logout
      await api.auth.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state regardless of API call success
      setAuthState({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}