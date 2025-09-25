"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, AuthState } from "../types";
import Cookies from "js-cookie";
import { decrypt, encrypt } from "../lib/crypto";

interface AuthContextType extends AuthState {
  login: (email: string, password: string, role: 'student' | 'teacher') => Promise<void>;
  register: (name: string, email: string, password: string, role: 'student' | 'teacher') => Promise<void>;
  logout: () => void;
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
      const token = Cookies.get("auth_token");
      const userInfo = Cookies.get("user_info");

      if (token && userInfo) {
        const decryptedUserInfo = decrypt(userInfo);
        const user: User = JSON.parse(decryptedUserInfo);
        
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

  const login = async (email: string, password: string, role: 'student' | 'teacher') => {
    try {
      // Demo account handling
      let mockUser: User;
      
      if (email === "student@demo.com" && password === "demo123") {
        mockUser = {
          id: "demo_student_123",
          email: "student@demo.com",
          name: "Alex Johnson",
          role: "student",
          createdAt: new Date(),
        };
      } else if (email === "teacher@demo.com" && password === "demo123") {
        mockUser = {
          id: "demo_teacher_456",
          email: "teacher@demo.com", 
          name: "Dr. Sarah Wilson",
          role: "teacher",
          createdAt: new Date(),
        };
      } else {
        // For other accounts, create a mock user
        mockUser = {
          id: Math.random().toString(36).substr(2, 9),
          email,
          name: email.split('@')[0], // Use part of email as name for demo
          role,
          createdAt: new Date(),
        };
      }

      // Store encrypted user info in cookies
      const encryptedUserInfo = encrypt(JSON.stringify(mockUser));
      const token = Math.random().toString(36).substr(2);

      Cookies.set("auth_token", token, { expires: 7, secure: true, sameSite: 'strict' });
      Cookies.set("user_info", encryptedUserInfo, { expires: 7, secure: true, sameSite: 'strict' });

      setAuthState({
        user: mockUser,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      throw new Error("Login failed. Please check your credentials.");
    }
  };

  const register = async (name: string, email: string, password: string, role: 'student' | 'teacher') => {
    try {
      // In a real app, this would be an API call
      // For demo purposes, we'll simulate a successful registration
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        name,
        role,
        createdAt: new Date(),
      };

      // Store encrypted user info in cookies
      const encryptedUserInfo = encrypt(JSON.stringify(newUser));
      const token = Math.random().toString(36).substr(2);

      Cookies.set("auth_token", token, { expires: 7, secure: true, sameSite: 'strict' });
      Cookies.set("user_info", encryptedUserInfo, { expires: 7, secure: true, sameSite: 'strict' });

      setAuthState({
        user: newUser,
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      throw new Error("Registration failed. Please try again.");
    }
  };

  const logout = () => {
    Cookies.remove("auth_token");
    Cookies.remove("user_info");
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
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