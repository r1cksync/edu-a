'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Eye, Plus, Minus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Question {
  _id: string;
  category: string;
  difficulty: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation: string;
  tags: string[];
  createdAt: string;
}

interface QuestionBrowserProps {
  selectedQuestions: string[];
  onQuestionToggle: (questionId: string) => void;
  maxQuestions?: number;
}

export default function QuestionBrowser({ 
  selectedQuestions, 
  onQuestionToggle, 
  maxQuestions 
}: QuestionBrowserProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    category: '',
    difficulty: '',
    search: '',
    page: 1,
    limit: 20
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  useEffect(() => {
    fetchQuestions();
  }, [filters]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const data = await apiClient.get<{
        success: boolean;
        data: {
          questions: Question[];
          pagination: {
            current: number;
            pages: number;
            total: number;
          };
        };
      }>(`/questions?${queryParams.toString()}`);

      if (data.success) {
        setQuestions(data.data.questions);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (questionId: string) => {
    try {
      const data = await apiClient.get<{
        success: boolean;
        data: Question;
      }>(`/questions/${questionId}`);

      if (data.success) {
        setSelectedQuestion(data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching question details:', error);
      toast.error('Failed to load question details');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryShort = (category: string) => {
    switch (category) {
      case 'Quantitative Aptitude': return 'QA';
      case 'Logical Reasoning and Data Interpretation': return 'LR&DI';
      case 'Verbal Ability and Reading Comprehension': return 'VA&RC';
      default: return category;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Question Browser
          </CardTitle>
          <CardDescription>
            Browse and select questions individually. Selected: {selectedQuestions.length}
            {maxQuestions && ` / ${maxQuestions}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by content or tags..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) => handleFilterChange('category', value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Quantitative Aptitude">Quantitative Aptitude</SelectItem>
                  <SelectItem value="Logical Reasoning and Data Interpretation">
                    Logical Reasoning & Data Interpretation
                  </SelectItem>
                  <SelectItem value="Verbal Ability and Reading Comprehension">
                    Verbal Ability & Reading Comprehension
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={filters.difficulty || "all"}
                onValueChange={(value) => handleFilterChange('difficulty', value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Questions per page</Label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) => handleFilterChange('limit', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({pagination.total} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No questions found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <div
                  key={question._id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedQuestions.includes(question._id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={selectedQuestions.includes(question._id)}
                        onCheckedChange={() => onQuestionToggle(question._id)}
                        disabled={
                          !!(maxQuestions && 
                          !selectedQuestions.includes(question._id) && 
                          selectedQuestions.length >= maxQuestions)
                        }
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getDifficultyColor(question.difficulty)}>
                            {question.difficulty.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {getCategoryShort(question.category)}
                          </Badge>
                          {question.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        <p className="text-sm text-gray-600 overflow-hidden" style={{ 
                          display: '-webkit-box', 
                          WebkitLineClamp: 2, 
                          WebkitBoxOrient: 'vertical' 
                        }}>
                          {question.question}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(question._id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {((pagination.current - 1) * filters.limit) + 1} to{' '}
                {Math.min(pagination.current * filters.limit, pagination.total)} of{' '}
                {pagination.total} questions
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={pagination.current <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = Math.max(1, pagination.current - 2) + i;
                    if (pageNum > pagination.pages) return null;
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.current ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current >= pagination.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
            <DialogDescription>
              Review the complete question with all options and explanation
            </DialogDescription>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getDifficultyColor(selectedQuestion.difficulty)}>
                  {selectedQuestion.difficulty.toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {selectedQuestion.category}
                </Badge>
                {selectedQuestion.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Question:</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedQuestion.question}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Options:</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedQuestion.options).map(([key, value]) => (
                      <div
                        key={key}
                        className={`p-3 rounded-lg border ${
                          key === selectedQuestion.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <span className="font-medium">{key})</span> {value}
                        {key === selectedQuestion.correctAnswer && (
                          <Badge className="ml-2 bg-green-500">Correct</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedQuestion.explanation && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Explanation:</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Question ID: {selectedQuestion._id}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedQuestions.includes(selectedQuestion._id) ? "destructive" : "default"}
                    onClick={() => onQuestionToggle(selectedQuestion._id)}
                    disabled={
                      !!(maxQuestions && 
                      !selectedQuestions.includes(selectedQuestion._id) && 
                      selectedQuestions.length >= maxQuestions)
                    }
                  >
                    {selectedQuestions.includes(selectedQuestion._id) ? (
                      <>
                        <Minus className="h-4 w-4 mr-2" />
                        Remove from Test
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Test
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}