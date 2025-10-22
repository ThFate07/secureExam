"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { 
  Plus, 
  Search, 
  Edit,
  Eye,
  Trash2,
  Calendar,
  Clock,
  Users,
  FileText,
  MoreHorizontal,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api/client';

interface ExamQuestion {
  id: string;
  questionId: string;
  order: number;
  question: {
    id: string;
    title: string;
    points: number;
  };
}

interface DBExam {
  id: string;
  title: string;
  description: string;
  duration: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  examQuestions: ExamQuestion[];
  _count: {
    enrollments: number;
    attempts: number;
  };
}

const MyExamsPage = () => {
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [exams, setExams] = useState<DBExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch exams from API
  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.exams.list();
        setExams(response.exams || []);
      } catch (err) {
        console.error('Failed to fetch exams:', err);
        setError(err instanceof Error ? err.message : 'Failed to load exams');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const [filteredExams, setFilteredExams] = useState<DBExam[]>([]);
  // track which exam action menu is open (by exam id)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menusContainerRef = useRef<HTMLDivElement | null>(null);

  // close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!menusContainerRef.current) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-exam-menu-container]')) return; // click inside a menu container
      setOpenMenuId(null);
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    const filtered = exams.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           exam.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All Status' || exam.status === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });

    // Sort exams
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'startDate':
          // fallback to createdAt as we don't have explicit startDate in store
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredExams(filtered);
  }, [searchTerm, statusFilter, sortBy, sortOrder, exams]);

  const getStatusColor = (status: string) => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'PUBLISHED':
      case 'ONGOING':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'ARCHIVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const statusUpper = status.toUpperCase();
    switch (statusUpper) {
      case 'PUBLISHED':
      case 'ONGOING':
        return <Clock className="h-3 w-3" />;
      case 'DRAFT':
        return <Edit className="h-3 w-3" />;
      case 'COMPLETED':
        return <FileText className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };
  
  const handleDelete = useCallback(async (exam: DBExam) => {
    if (confirm(`Delete exam "${exam.title}"? This cannot be undone.`)) {
      try {
        await api.exams.delete(exam.id);
        // Refresh the exams list
        setExams(prev => prev.filter(e => e.id !== exam.id));
        alert(`Exam "${exam.title}" deleted.`);
      } catch (err) {
        console.error('Failed to delete exam:', err);
        alert('Failed to delete exam. Please try again.');
      }
    }
  }, []);

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">My Exams</h1>
          <p className="text-gray-700 mt-2">Manage your created exams and track their performance</p>
        </div>
        <Button onClick={() => router.push('/dashboard/teacher/create-exam')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Exam
        </Button>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <Label htmlFor="search">Search Exams</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input id="search" placeholder="Search by title or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="min-w-[140px]">
              <Label>Status</Label>
              <div className="mt-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Status">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="min-w-[140px]">
              <Label>Sort By</Label>
              <div className="mt-1">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="startDate">Start Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="min-w-[120px]">
              <Label>Order</Label>
              <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="w-full mt-1 p-2 border border-gray-300 rounded-md flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors">
                <ArrowUpDown className="h-4 w-4" />
                <span className="whitespace-nowrap">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredExams.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-white">
          <FileText className="h-14 w-14 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-700 mb-6">
            {loading ? 'Loading exams...' : error ? `Error: ${error}` : (searchTerm || statusFilter !== 'All Status' ? 'No exams match your filters.' : "You haven't created any exams yet.")}
          </p>
          {!loading && !error && (
            <Button onClick={() => router.push('/dashboard/teacher/create-exam')}>
              <Plus className="h-4 w-4 mr-2" />Create Your First Exam
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const totalPoints = exam.examQuestions.reduce((s: number, eq) => s + (eq.question.points ?? 0), 0);
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 text-gray-900">{exam.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(exam.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(exam.status)}
                            <span className="capitalize">{exam.status.toLowerCase()}</span>
                          </div>
                        </Badge>
                        <Badge variant="outline" className="text-blue-600">{totalPoints} pts</Badge>
                      </div>
                    </div>
                    <div
                      className="relative"
                      data-exam-menu-container
                      ref={openMenuId === exam.id ? menusContainerRef : undefined}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === exam.id}
                        aria-controls={`exam-actions-${exam.id}`}
                        onClick={() => setOpenMenuId(openMenuId === exam.id ? null : exam.id)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Exam actions</span>
                      </Button>
                      {openMenuId === exam.id && (
                        <div
                          id={`exam-actions-${exam.id}`}
                          role="menu"
                          aria-label="Exam actions"
                          className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[180px] animate-in fade-in-0 zoom-in-95"
                        >
                          <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                            onClick={() => { setOpenMenuId(null); router.push(`/dashboard/teacher/exam/${exam.id}`); }}
                          >
                            <Edit className="h-4 w-4 mr-3 text-gray-500" />
                            Edit
                          </button>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                            onClick={() => { setOpenMenuId(null); router.push(`/exam/${exam.id}`); }}
                          >
                            <Eye className="h-4 w-4 mr-3 text-gray-500" />
                            Preview (Student)
                          </button>
                          {exam.status !== 'DRAFT' && (
                            <button 
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                              onClick={() => { setOpenMenuId(null); router.push(`/dashboard/teacher/exam/${exam.id}/submissions`); }}
                            >
                              <FileText className="h-4 w-4 mr-3 text-gray-500" />
                              Results
                            </button>
                          )}
                          <div className="border-t border-gray-200 my-1"></div>
                          <button 
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                            onClick={() => { setOpenMenuId(null); handleDelete(exam); }}
                          >
                            <Trash2 className="h-4 w-4 mr-3" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-700 line-clamp-2 min-h-[40px]">{exam.description || 'No description provided.'}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-700"><Clock className="h-4 w-4" /><span>{exam.duration} min</span></div>
                    <div className="flex items-center space-x-2 text-gray-700"><Users className="h-4 w-4" /><span>{exam.examQuestions.length} questions</span></div>
                    <div className="flex items-center space-x-2 text-gray-700"><Calendar className="h-4 w-4" /><span>{formatDate(exam.createdAt)}</span></div>
                    <div className="text-sm text-gray-700">Updated {formatDate(exam.updatedAt)}</div>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex space-x-2">
                      {exam.status !== 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/teacher/exam/${exam.id}/submissions`)} className="flex-1"><FileText className="h-4 w-4 mr-1" />Results</Button>
                      )}
                      <Button size="sm" onClick={() => router.push(`/dashboard/teacher/exam/${exam.id}`)} className={exam.status === 'DRAFT' ? 'flex-1 w-full' : 'flex-1'}><Edit className="h-4 w-4 mr-1" />Edit</Button>
                    </div>
                  </div>
                </CardContent>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Ensure file ends with a newline and proper export

export default MyExamsPage;