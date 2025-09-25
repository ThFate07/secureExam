"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Plus, Search, Filter, Edit3, Trash2, BookOpen, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { Question, QuestionFilter } from '../../../types/question';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionBankProps {
  teacherId: string;
}

const QuestionBank: React.FC<QuestionBankProps> = ({ teacherId }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<QuestionFilter>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  // Mock data for development
  useEffect(() => {
    const mockQuestions: Question[] = [
      {
        id: '1',
        title: 'Basic JavaScript Variables',
        type: 'multiple-choice',
        question: 'Which of the following is the correct way to declare a variable in JavaScript?',
        options: ['var myVar;', 'variable myVar;', 'declare myVar;', 'let myVar = undefined;'],
        correctAnswer: 'var myVar;',
        points: 2,
        subject: 'JavaScript',
        tags: ['variables', 'syntax', 'basics'],
        explanation: 'The var keyword is used to declare variables in JavaScript.',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        createdBy: teacherId
      },
      {
        id: '2',
        title: 'React Hooks Understanding',
        type: 'true-false',
        question: 'useState can only be used in class components.',
        options: ['True', 'False'],
        correctAnswer: 'False',
        points: 1,
        subject: 'React',
        tags: ['hooks', 'useState', 'components'],
        explanation: 'useState is a hook that can only be used in functional components, not class components.',
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16'),
        createdBy: teacherId
      },
      {
        id: '3',
        title: 'Algorithm Complexity',
        type: 'short-answer',
        question: 'Explain the time complexity of a binary search algorithm and justify your answer.',
        correctAnswer: 'O(log n) - because we eliminate half of the search space in each iteration',
        points: 5,
        subject: 'Algorithms',
        tags: ['complexity', 'binary-search', 'big-o'],
        explanation: 'Binary search has O(log n) time complexity because it divides the search space in half with each comparison.',
        createdAt: new Date('2024-01-17'),
        updatedAt: new Date('2024-01-17'),
        createdBy: teacherId
      }
    ];
    setQuestions(mockQuestions);
    setFilteredQuestions(mockQuestions);
  }, [teacherId]);

  // Filter and search logic
  useEffect(() => {
    let filtered = questions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(q => filters.type!.includes(q.type));
    }

    // Subject filter
    if (filters.subject && filters.subject.length > 0) {
      filtered = filtered.filter(q => filters.subject!.includes(q.subject));
    }

    setFilteredQuestions(filtered);
  }, [searchTerm, filters, questions]);

  const toggleQuestionExpansion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple-choice': return '⊚';
      case 'true-false': return '✓/✗';
      case 'short-answer': return '📝';
      case 'essay': return '📄';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Question Bank
          </h1>
          <p className="text-gray-600 mt-2">Manage and organize your exam questions</p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger >
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white border-2 border-gray-200 shadow-2xl overflow-hidden">
            <div className="h-full max-h-[calc(90vh-8rem)] overflow-y-scroll modal-scrollbar scroll-smooth modal-content" style={{ transform: 'translateZ(0)', WebkitOverflowScrolling: 'touch' }}>
              <div className="p-6">
                <DialogHeader className="border-b border-gray-100 pb-6 mb-6">
                  <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                    {editingQuestion ? 'Edit Question' : 'Create New Question'}
                  </DialogTitle>
                  <DialogDescription className="text-base text-gray-600 mt-2">
                    {editingQuestion ? 'Update your question details below.' : 'Add a new question to your question bank.'}
                  </DialogDescription>
                </DialogHeader>
            <QuestionForm 
              question={editingQuestion}
              onSave={(question) => {
                if (editingQuestion) {
                  setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? question : q));
                } else {
                  setQuestions(prev => [...prev, { ...question, id: Date.now().toString() }]);
                }
                setIsCreateModalOpen(false);
                setEditingQuestion(null);
              }}
              onCancel={() => {
                setIsCreateModalOpen(false);
                setEditingQuestion(null);
              }}
            />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search questions by title, content, subject, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4"
                >
                  <div>
                    <Label htmlFor="type-filter">Question Type</Label>
                    <Select value={filters.type?.[0] || ""} onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, type: value ? [value] : undefined }))
                    }>
                      <SelectTrigger className="bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-600 transition-colors duration-200">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-gray-200 shadow-lg max-h-60 overflow-auto z-50">
                        <SelectItem value="multiple-choice" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">Multiple Choice</SelectItem>
                        <SelectItem value="true-false" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">True/False</SelectItem>
                        <SelectItem value="short-answer" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">Short Answer</SelectItem>
                        <SelectItem value="essay" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject-filter">Subject</Label>
                    <Select value={filters.subject?.[0] || ""} onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, subject: value ? [value] : undefined }))
                    }>
                      <SelectTrigger className="bg-white border border-gray-300 hover:border-gray-400 focus:border-gray-600 transition-colors duration-200">
                        <SelectValue placeholder="All subjects" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-gray-200 shadow-lg max-h-60 overflow-auto z-50">
                        <SelectItem value="JavaScript" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">JavaScript</SelectItem>
                        <SelectItem value="React" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">React</SelectItem>
                        <SelectItem value="Algorithms" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">Algorithms</SelectItem>
                        <SelectItem value="Data Structures" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150 cursor-pointer px-3 py-2">Data Structures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {filteredQuestions.length} of {questions.length} questions
          </p>
        </div>

        <AnimatePresence>
          {filteredQuestions.map((question) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              layout
            >
              <Card className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg">{getTypeIcon(question.type)}</span>
                        <CardTitle className="text-lg text-gray-900">{question.title}</CardTitle>
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          {question.points} pts
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{question.subject}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleQuestionExpansion(question.id)}
                      >
                        {expandedQuestions.has(question.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingQuestion(question);
                          setIsCreateModalOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setQuestions(prev => prev.filter(q => q.id !== question.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <AnimatePresence>
                  {expandedQuestions.has(question.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <CardContent className="pt-0">
                        <div className="border-t pt-4 space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                            <p className="text-gray-700">{question.question}</p>
                          </div>

                          {question.options && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Options:</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {question.options.map((option, index) => (
                                  <div
                                    key={index}
                                    className={`p-2 rounded border ${
                                      option === question.correctAnswer
                                        ? 'bg-green-50 border-green-200 text-green-800'
                                        : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                                    {option === question.correctAnswer && (
                                      <span className="ml-2 text-green-600">✓ Correct</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {question.explanation && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Explanation:</h4>
                              <p className="text-gray-600 italic">{question.explanation}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {question.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredQuestions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || Object.keys(filters).length > 0
                  ? "Try adjusting your search or filters to find questions."
                  : "Start by creating your first question to build your question bank."
                }
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Question
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Question Form Component
const QuestionForm: React.FC<{
  question?: Question | null;
  onSave: (question: Question) => void;
  onCancel: () => void;
}> = ({ question, onSave, onCancel }) => {
  // Convert existing correct answer to index if it's a multiple choice question
  const getInitialCorrectAnswer = () => {
    if (!question?.correctAnswer) return '';
    if (question.type === 'multiple-choice' && question.options) {
      const answerIndex = question.options.indexOf(question.correctAnswer as string);
      return answerIndex >= 0 ? answerIndex.toString() : '';
    }
    return question.correctAnswer as string;
  };

  const [formData, setFormData] = useState({
    title: question?.question || '', // Use question as title since they're the same
    type: question?.type || 'multiple-choice' as Question['type'],
    question: question?.question || '',
    options: question?.options || ['', '', '', ''],
    correctAnswer: getInitialCorrectAnswer(),
    points: question?.points || 1,
    subject: question?.subject || '',
    tags: question?.tags?.join(', ') || '',
    explanation: question?.explanation || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For multiple choice, convert index back to actual option text
    let correctAnswer = formData.correctAnswer;
    if (formData.type === 'multiple-choice' && typeof correctAnswer === 'string' && !isNaN(Number(correctAnswer))) {
      const answerIndex = parseInt(correctAnswer);
      correctAnswer = formData.options[answerIndex] || '';
    }
    
    const questionData: Question = {
      id: question?.id || '',
      title: formData.question, // Use question text as title
      type: formData.type,
      question: formData.question,
      options: formData.type === 'multiple-choice' || formData.type === 'true-false' ? formData.options.filter(opt => opt.trim()) : undefined,
      correctAnswer: correctAnswer,
      points: formData.points,
      subject: formData.subject,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      explanation: formData.explanation || undefined,
      createdAt: question?.createdAt || new Date(),
      updatedAt: new Date(),
      createdBy: question?.createdBy || 'current-teacher-id'
    };

    onSave(questionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" style={{ contain: 'layout style', willChange: 'scroll-position' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <Label htmlFor="type" className="text-sm font-semibold text-gray-900 mb-2 block">Question Type</Label>
          <Select value={formData.type} onValueChange={(value) => 
            setFormData(prev => ({ ...prev, type: value as Question['type'] }))
          }>
            <SelectTrigger className="h-12 border-2 border-gray-200 bg-white text-gray-900 focus:border-gray-600 focus:shadow-sm text-base transition-all duration-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-2 border-gray-200 shadow-lg will-change-transform">
              <SelectItem value="multiple-choice" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Multiple Choice</SelectItem>
              <SelectItem value="true-false" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">True/False</SelectItem>
              <SelectItem value="short-answer" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Short Answer</SelectItem>
              <SelectItem value="essay" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Essay</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="subject" className="text-sm font-semibold text-gray-900 mb-2 block">Subject</Label>
          <Select value={formData.subject} onValueChange={(value) => 
            setFormData(prev => ({ ...prev, subject: value }))
          }>
            <SelectTrigger className="h-12 border-2 border-gray-200 bg-white text-gray-900 focus:border-gray-600 focus:shadow-sm text-base transition-all duration-200">
              <SelectValue placeholder="Select a subject" />
            </SelectTrigger>
            <SelectContent className="bg-white border-2 border-gray-200 shadow-lg will-change-transform">
              <SelectItem value="javascript" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">JavaScript</SelectItem>
              <SelectItem value="python" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Python</SelectItem>
              <SelectItem value="java" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Java</SelectItem>
              <SelectItem value="react" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">React</SelectItem>
              <SelectItem value="nodejs" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Node.js</SelectItem>
              <SelectItem value="html-css" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">HTML/CSS</SelectItem>
              <SelectItem value="database" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Database</SelectItem>
              <SelectItem value="algorithms" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Algorithms</SelectItem>
              <SelectItem value="data-structures" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Data Structures</SelectItem>
              <SelectItem value="calculus" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Calculus</SelectItem>
              <SelectItem value="algebra" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Algebra</SelectItem>
              <SelectItem value="statistics" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Statistics</SelectItem>
              <SelectItem value="physics" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Physics</SelectItem>
              <SelectItem value="chemistry" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Chemistry</SelectItem>
              <SelectItem value="biology" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Biology</SelectItem>
              <SelectItem value="english" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">English</SelectItem>
              <SelectItem value="other" className="text-gray-900 hover:bg-gray-100 transition-colors duration-150">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="points" className="text-sm font-semibold text-gray-900 mb-2 block">Points</Label>
          <Input
            id="points"
            type="number"
            min="1"
            max="100"
            value={formData.points}
            onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) }))}
            className="h-12 border-2 border-gray-200 bg-white text-gray-900 focus:border-gray-600 focus:ring-0 focus:shadow-sm text-base transition-all duration-200"
            required
          />
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200" style={{ contain: 'layout' }}>
        <Label htmlFor="question" className="text-sm font-semibold text-gray-900 mb-3 block">Question</Label>
        <Textarea
          id="question"
          value={formData.question}
          onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
          placeholder="Enter your question here..."
          rows={4}
          className="border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-600 focus:ring-0 focus:shadow-sm text-base min-h-[120px] resize-y transition-all duration-200"
          style={{ WebkitOverflowScrolling: 'touch' }}
          required
        />
      </div>

      {(formData.type === 'multiple-choice' || formData.type === 'true-false') && (
        <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200" style={{ contain: 'layout' }}>
          <Label className="text-sm font-semibold text-gray-900 mb-4 block">Answer Options</Label>
          <div className="space-y-4">
            {formData.type === 'true-false' ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">True</Label>
                  <div className="flex items-center space-x-3 p-3 bg-white border-2 border-gray-200 rounded-lg transform-gpu">
                    <Input value="True" disabled className="border-0 bg-transparent text-gray-900 font-medium" />
                    <input
                      type="radio"
                      name="correctAnswer"
                      value="True"
                      checked={formData.correctAnswer === 'True'}
                      onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="w-5 h-5 text-gray-900 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">False</Label>
                  <div className="flex items-center space-x-3 p-3 bg-white border-2 border-gray-200 rounded-lg transform-gpu">
                    <Input value="False" disabled className="border-0 bg-transparent text-gray-900 font-medium" />
                    <input
                      type="radio"
                      name="correctAnswer"
                      value="False"
                      checked={formData.correctAnswer === 'False'}
                      onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="w-5 h-5 text-gray-900 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200 transform-gpu">
                  <Label className="w-8 text-sm font-semibold text-gray-700">{String.fromCharCode(65 + index)}.</Label>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...formData.options];
                      newOptions[index] = e.target.value;
                      setFormData(prev => ({ ...prev, options: newOptions }));
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="flex-1 border-0 bg-transparent text-gray-900 placeholder-gray-500 focus:ring-0 focus:outline-none text-base transition-colors duration-200"
                  />
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      value={index.toString()}
                      checked={formData.correctAnswer === index.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      className="w-5 h-5 text-gray-900 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-600">Correct</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {(formData.type === 'short-answer' || formData.type === 'essay') && (
        <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200" style={{ contain: 'layout' }}>
          <Label htmlFor="correctAnswer" className="text-sm font-semibold text-gray-900 mb-3 block">Sample Answer</Label>
          <Textarea
            id="correctAnswer"
            value={formData.correctAnswer}
            onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
            placeholder="Enter a sample correct answer or key points..."
            rows={3}
            className="border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-600 focus:ring-0 focus:shadow-sm text-base min-h-[100px] resize-y transition-all duration-200"
            style={{ WebkitOverflowScrolling: 'touch' }}
            required
          />
        </div>
      )}

      <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-200" style={{ contain: 'layout' }}>
        <Label htmlFor="explanation" className="text-sm font-semibold text-gray-900 mb-3 block">Explanation (Optional)</Label>
        <Textarea
          id="explanation"
          value={formData.explanation}
          onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
          placeholder="Provide an explanation for the correct answer..."
          rows={3}
          className="border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-600 focus:ring-0 focus:shadow-sm text-base min-h-[100px] resize-y transition-all duration-200"
          style={{ WebkitOverflowScrolling: 'touch' }}
        />
      </div>

      <div>
        <Label htmlFor="tags" className="text-sm font-semibold text-gray-900 mb-2 block">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          placeholder="e.g., variables, syntax, basics"
          className="h-12 border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:border-gray-600 focus:ring-0 focus:shadow-sm text-base transition-all duration-200"
        />
      </div>

      <div className="flex justify-end space-x-4 pt-8 border-t-2 border-gray-100">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="h-12 px-8 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold text-base transition-all duration-200"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="h-12 px-8 bg-gray-900 text-white hover:bg-gray-800 font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
        >
          {question ? 'Update Question' : 'Create Question'}
        </Button>
      </div>
    </form>
  );
};

export default QuestionBank;