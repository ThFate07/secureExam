"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  UserPlus,
  Users,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Award,
  Filter,
  ArrowUpDown,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import { Student } from '../../../types/question';
import { motion } from 'framer-motion';

const StudentManagementPage = () => {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  // Mock students data
  const [students] = useState<Student[]>([
    {
      id: 'student-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      name: 'John Doe',
      phone: '+1 (555) 123-4567',
      studentId: 'STU001',
      enrollmentDate: new Date('2024-01-15'),
      status: 'active',
      academicStatus: 'regular',
      class: 'CS-101',
      address: {
        street: '123 Main St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'USA'
      },
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+1 (555) 987-6543',
        relationship: 'Mother'
      },
      academicInfo: {
        gpa: 3.8,
        totalCredits: 90,
        completedCredits: 75,
        semester: 'Spring',
        year: 3,
        major: 'Computer Science',
        minor: 'Mathematics'
      },
      enrolledClasses: ['CS-101'],
      createdAt: new Date('2024-01-15')
    },
    {
      id: 'student-2',
      firstName: 'Emma',
      lastName: 'Wilson',
      email: 'emma.wilson@email.com',
      name: 'Emma Wilson',
      phone: '+1 (555) 234-5678',
      studentId: 'STU002',
      enrollmentDate: new Date('2024-01-20'),
      status: 'active',
      academicStatus: 'honors',
      class: 'CS-101',
      address: {
        street: '456 Oak Ave',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'USA'
      },
      emergencyContact: {
        name: 'Robert Wilson',
        phone: '+1 (555) 876-5432',
        relationship: 'Father'
      },
      academicInfo: {
        gpa: 3.9,
        totalCredits: 120,
        completedCredits: 105,
        semester: 'Spring',
        year: 4,
        major: 'Computer Science'
      },
      enrolledClasses: ['CS-101'],
      createdAt: new Date('2024-01-20')
    },
    {
      id: 'student-3',
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@email.com',
      name: 'Michael Brown',
      phone: '+1 (555) 345-6789',
      studentId: 'STU003',
      enrollmentDate: new Date('2024-02-01'),
      status: 'inactive',
      academicStatus: 'regular',
      class: 'CS-102',
      address: {
        street: '789 Pine St',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'USA'
      },
      emergencyContact: {
        name: 'Sarah Brown',
        phone: '+1 (555) 765-4321',
        relationship: 'Mother'
      },
      academicInfo: {
        gpa: 3.5,
        totalCredits: 60,
        completedCredits: 45,
        semester: 'Spring',
        year: 2,
        major: 'Computer Engineering'
      },
      enrolledClasses: ['CS-102'],
      createdAt: new Date('2024-02-01')
    },
    {
      id: 'student-4',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@email.com',
      name: 'Sarah Johnson',
      phone: '+1 (555) 456-7890',
      studentId: 'STU004',
      enrollmentDate: new Date('2024-01-10'),
      status: 'active',
      academicStatus: 'dean-list',
      class: 'CS-102',
      address: {
        street: '321 Elm Dr',
        city: 'City',
        state: 'State',
        zipCode: '12345',
        country: 'USA'
      },
      emergencyContact: {
        name: 'David Johnson',
        phone: '+1 (555) 654-3210',
        relationship: 'Father'
      },
      academicInfo: {
        gpa: 4.0,
        totalCredits: 90,
        completedCredits: 80,
        semester: 'Spring',
        year: 3,
        major: 'Software Engineering'
      },
      enrolledClasses: ['CS-102'],
      createdAt: new Date('2024-01-10')
    }
  ]);

  // Mock classes data
  const classes = [
    'CS-101',
    'CS-102',
    'CS-201',
    'CS-202',
    'MATH-101'
  ];

  const [filteredStudents, setFilteredStudents] = useState<Student[]>(students);

  useEffect(() => {
    const filtered = students.filter(student => {
      const matchesSearch = 
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      const matchesClass = classFilter === 'all' || student.class === classFilter;
      
      return matchesSearch && matchesStatus && matchesClass;
    });

    // Sort students
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'studentId':
          aValue = a.studentId;
          bValue = b.studentId;
          break;
        case 'enrollmentDate':
          aValue = new Date(a.enrollmentDate).getTime();
          bValue = new Date(b.enrollmentDate).getTime();
          break;
        case 'gpa':
          aValue = a.academicInfo.gpa;
          bValue = b.academicInfo.gpa;
          break;
        default:
          aValue = a.firstName.toLowerCase();
          bValue = b.firstName.toLowerCase();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredStudents(filtered);
  }, [searchTerm, statusFilter, classFilter, sortBy, sortOrder, students]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <UserCheck className="h-3 w-3" />;
      case 'inactive':
        return <UserX className="h-3 w-3" />;
      case 'suspended':
        return <UserX className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on students:`, selectedStudents);
    alert(`${action} performed on ${selectedStudents.length} student(s)`);
    setSelectedStudents([]);
  };

  const handleExportData = () => {
    const csvContent = [
      ['Student ID', 'Name', 'Email', 'Phone', 'Class', 'Status', 'GPA', 'Enrollment Date'],
      ...filteredStudents.map(student => [
        student.studentId,
        `${student.firstName} ${student.lastName}`,
        student.email,
        student.phone,
        student.class,
        student.status,
        student.academicInfo.gpa.toString(),
        student.enrollmentDate.toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Student Management
          </h1>
          <p className="text-gray-600 mt-2">Manage student enrollment and track academic performance</p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              +3 from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average GPA</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(students.reduce((sum, s) => sum + s.academicInfo.gpa, 0) / students.length).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Class performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classes.length}</div>
            <p className="text-xs text-muted-foreground">
              Active courses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters & Actions</span>
            </div>
            {selectedStudents.length > 0 && (
              <div className="flex space-x-2">
                <Badge variant="outline">
                  {selectedStudents.length} selected
                </Badge>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('Email')}>
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('Deactivate')}>
                  <UserX className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Students</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or student ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div>
              <Label htmlFor="class">Class</Label>
              <select
                id="class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="sortBy">Sort By</Label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="studentId">Student ID</option>
                <option value="enrollmentDate">Enrollment Date</option>
                <option value="gpa">GPA</option>
              </select>
            </div>

            <div>
              <Label htmlFor="sortOrder">Order</Label>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full p-2 border border-gray-300 rounded-md flex items-center justify-center space-x-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span>{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || classFilter !== 'all'
              ? "No students match your current filters."
              : "No students have been added yet."}
          </p>
          {(!searchTerm && statusFilter === 'all' && classFilter === 'all') && (
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Student
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Students ({filteredStudents.length})</span>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === filteredStudents.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <Label>Select All</Label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredStudents.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                        className="rounded"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {student.firstName} {student.lastName}
                          </h3>
                          <Badge className={getStatusColor(student.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(student.status)}
                              <span className="capitalize">{student.status}</span>
                            </div>
                          </Badge>
                          <Badge variant="outline">
                            {student.studentId}
                          </Badge>
                          <Badge variant="outline" className="text-blue-600">
                            {student.class}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>{student.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4" />
                            <span>{student.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>Enrolled: {formatDate(student.enrollmentDate)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-3 text-sm">
                          <div className="flex items-center space-x-1">
                            <Award className="h-4 w-4 text-yellow-600" />
                            <span>GPA: {student.academicInfo.gpa}</span>
                          </div>
                          <div>Year: {student.academicInfo.year}</div>
                          <div>Major: {student.academicInfo.major}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => console.log('View student:', student.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => console.log('Edit student:', student.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => console.log('Delete student:', student.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentManagementPage;