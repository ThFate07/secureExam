"use client";

import React from 'react';
import QuestionBank from '../../../components/teacher/questions/QuestionBank';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';

const QuestionsPage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  
  React.useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'teacher')) {
      router.push('/auth');
      return;
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'teacher') {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <QuestionBank teacherId={user.id} />
    </div>
  );
};

export default QuestionsPage;