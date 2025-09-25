"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "../components/auth/AuthForm";
import { useAuth } from "../hooks/useAuth";

export default function AuthPage() {
  const { login, register, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (data: { email: string; password: string; role: 'student' | 'teacher' }) => {
    await login(data.email, data.password, data.role);
  };

  const handleRegister = async (data: { name: string; email: string; password: string; role: 'student' | 'teacher' }) => {
    await register(data.name, data.email, data.password, data.role);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return <AuthForm onLogin={handleLogin} onRegister={handleRegister} />;
}