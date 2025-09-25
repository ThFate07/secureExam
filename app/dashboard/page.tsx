"use client";

import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth");
    } else if (user && isAuthenticated) {
      // Redirect based on user role
      if (user.role === 'teacher') {
        router.push("/dashboard/teacher");
      } else {
        router.push("/dashboard/student");
      }
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return null; // Will redirect
}