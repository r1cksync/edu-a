'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import QuestionBrowser from './QuestionBrowser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Switch } from '@/components/ui/switch';

// Simple Switch component inline
const SimpleSwitch: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}> = ({ checked, onCheckedChange, id }) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={checked}
    className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    }`}
    onClick={() => onCheckedChange(!checked)}
  >
    <span
      className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Settings, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface QuestionCriteria {
  distribution: {
    quantitative: {
      easy: number;
      medium: number;
      hard: number;
    };
    logical: {
      easy: number;
      medium: number;
      hard: number;
    };
    verbal: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  pointsPerQuestion: number;
  timePerQuestion: number;
}

interface TestSettings {
  allowMultipleAttempts: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  preventBackNavigation: boolean;
}

interface CreateScreeningTestProps {
  classroomId: string;
  onBack: () => void;
}

const CreateScreeningTest: React.FC<CreateScreeningTestProps> = ({ classroomId, onBack }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    totalTimeLimit: 60
  });

  const [questionCriteria, setQuestionCriteria] = useState<QuestionCriteria>({
    distribution: {
      quantitative: { easy: 0, medium: 0, hard: 0 },
      logical: { easy: 0, medium: 0, hard: 0 },
      verbal: { easy: 0, medium: 0, hard: 0 }
    },
    pointsPerQuestion: 1,
    timePerQuestion: 60
  });

  const [settings, setSettings] = useState<TestSettings>({
    allowMultipleAttempts: true,
    showResultsImmediately: true,
    showCorrectAnswers: false,
    shuffleQuestions: true,
    shuffleOptions: true,
    preventBackNavigation: false
  });

  // Question selection mode
  const [selectionMode, setSelectionMode] = useState<'automatic' | 'manual'>('automatic');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const [availableQuestions, setAvailableQuestions] = useState({
    quantitative: { easy: 0, medium: 0, hard: 0 },
    logical: { easy: 0, medium: 0, hard: 0 },
    verbal: { easy: 0, medium: 0, hard: 0 }
  });

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchAvailableQuestions();
  }, []);

  const fetchAvailableQuestions = async () => {
    try {
      setLoading(true);
      const categories = [
        'Quantitative Aptitude',
        'Logical Reasoning and Data Interpretation',
        'Verbal Ability and Reading Comprehension'
      ];
      const difficulties = ['easy', 'medium', 'hard'];
      
      const counts = {
        quantitative: { easy: 0, medium: 0, hard: 0 },
        logical: { easy: 0, medium: 0, hard: 0 },
        verbal: { easy: 0, medium: 0, hard: 0 }
      };

      for (let i = 0; i < categories.length; i++) {
        const categoryKey = ['quantitative', 'logical', 'verbal'][i];
        for (const difficulty of difficulties) {
          try {
            const data = await apiClient.get<{ count: number }>(`/questions/count?category=${encodeURIComponent(categories[i])}&difficulty=${difficulty}`);
            counts[categoryKey as keyof typeof counts][difficulty as keyof typeof counts.quantitative] = data.count || 0;
          } catch (error) {
            console.error(`Error fetching count for ${categories[i]} ${difficulty}:`, error);
            counts[categoryKey as keyof typeof counts][difficulty as keyof typeof counts.quantitative] = 0;
          }
        }
      }

      setAvailableQuestions(counts);
    } catch (error) {
      console.error('Error fetching available questions:', error);
      toast.error('Failed to load available questions');
    } finally {
      setLoading(false);
    }
  };

  const getTotalQuestions = () => {
    if (selectionMode === 'manual') {
      return selectedQuestions.length;
    }
    
    let total = 0;
    Object.values(questionCriteria.distribution).forEach(category => {
      Object.values(category).forEach(count => {
        total += count;
      });
    });
    return total;
  };

  const getTotalTimeEstimate = () => {
    const totalQuestions = getTotalQuestions();
    const timePerQuestion = selectionMode === 'manual' ? 60 : questionCriteria.timePerQuestion; // Default 60 seconds for manual
    return Math.ceil((totalQuestions * timePerQuestion) / 60);
  };

  const handleDistributionChange = (
    category: keyof typeof questionCriteria.distribution,
    difficulty: keyof typeof questionCriteria.distribution.quantitative,
    value: number
  ) => {
    const maxAvailable = availableQuestions[category][difficulty];
    const actualValue = Math.min(Math.max(0, value), maxAvailable);
    
    setQuestionCriteria(prev => ({
      ...prev,
      distribution: {
        ...prev.distribution,
        [category]: {
          ...prev.distribution[category],
          [difficulty]: actualValue
        }
      }
    }));
  };

  const handleQuickPreset = (preset: string) => {
    const presets = {
      balanced20: {
        quantitative: { easy: 3, medium: 3, hard: 1 },
        logical: { easy: 3, medium: 3, hard: 1 },
        verbal: { easy: 3, medium: 3, hard: 1 }
      },
      balanced30: {
        quantitative: { easy: 4, medium: 4, hard: 2 },
        logical: { easy: 4, medium: 4, hard: 2 },
        verbal: { easy: 4, medium: 4, hard: 2 }
      },
      easy50: {
        quantitative: { easy: 17, medium: 0, hard: 0 },
        logical: { easy: 17, medium: 0, hard: 0 },
        verbal: { easy: 16, medium: 0, hard: 0 }
      },
      mixed60: {
        quantitative: { easy: 8, medium: 8, hard: 4 },
        logical: { easy: 8, medium: 8, hard: 4 },
        verbal: { easy: 8, medium: 8, hard: 4 }
      }
    };

    const selectedPreset = presets[preset as keyof typeof presets];
    if (selectedPreset) {
      setQuestionCriteria(prev => ({
        ...prev,
        distribution: selectedPreset
      }));
    }
  };

  const handleQuestionToggle = (questionId: string) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation based on selection mode
    if (selectionMode === 'automatic') {
      const totalQuestions = getTotalQuestions();
      if (totalQuestions === 0) {
        toast.error('Please select at least one question');
        return;
      }
    } else {
      if (selectedQuestions.length === 0) {
        toast.error('Please select at least one question manually');
        return;
      }
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a test title');
      return;
    }

    try {
      setCreating(true);
      
      const submissionData: any = {
        ...formData,
        classroom: classroomId,
        settings
      };

      // Add question selection data based on mode
      if (selectionMode === 'automatic') {
        submissionData.questionCriteria = questionCriteria;
      } else {
        submissionData.selectedQuestions = selectedQuestions;
      }
      
      const data = await apiClient.post('/screening-tests', submissionData);

      toast.success('Screening test created successfully!');
      
      // Navigate back to list or to the new test
      onBack();
      
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create test');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create Screening Test</h1>
          <p className="text-gray-600">Design a comprehensive assessment for your students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Set up the basic details for your screening test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Test Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Monthly Assessment - Mathematics & Reasoning"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provide additional context about this test..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="totalTimeLimit">Total Time Limit (minutes) *</Label>
              <Input
                id="totalTimeLimit"
                type="number"
                min="1"
                max="300"
                value={formData.totalTimeLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, totalTimeLimit: parseInt(e.target.value) }))}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Question Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Question Selection</CardTitle>
            <CardDescription>
              Choose how to select questions for your test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selection Mode Toggle */}
            <div>
              <Label className="text-base font-medium">Selection Mode</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={selectionMode === 'automatic' ? 'default' : 'outline'}
                  onClick={() => setSelectionMode('automatic')}
                >
                  Automatic Selection
                </Button>
                <Button
                  type="button"
                  variant={selectionMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setSelectionMode('manual')}
                >
                  Manual Selection
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectionMode === 'automatic' 
                  ? 'Questions will be randomly selected based on your criteria'
                  : 'Browse and manually select specific questions'
                }
              </p>
            </div>

            {selectionMode === 'automatic' && (
              <>
                {/* Quick Presets */}
                <div>
                  <Label className="text-base font-medium">Quick Presets</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset('balanced20')}
                >
                  Balanced 21 Questions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset('balanced30')}
                >
                  Balanced 30 Questions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset('easy50')}
                >
                  Easy 50 Questions
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPreset('mixed60')}
                >
                  Mixed 60 Questions
                </Button>
              </div>
            </div>

            {/* Question Distribution Grid */}
            <div className="space-y-6">
              {Object.entries(questionCriteria.distribution).map(([categoryKey, categoryData]) => (
                <div key={categoryKey} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4 capitalize">
                    {categoryKey === 'quantitative' ? 'Quantitative Aptitude' :
                     categoryKey === 'logical' ? 'Logical Reasoning & Data Interpretation' :
                     'Verbal Ability & Reading Comprehension'}
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(categoryData).map(([difficulty, count]) => (
                      <div key={difficulty} className="space-y-2">
                        <Label className="text-sm font-medium capitalize">{difficulty}</Label>
                        <div className="flex items-center space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDistributionChange(
                              categoryKey as keyof typeof questionCriteria.distribution,
                              difficulty as keyof typeof categoryData,
                              count - 1
                            )}
                            disabled={count <= 0}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            max={availableQuestions[categoryKey as keyof typeof availableQuestions][difficulty as keyof typeof availableQuestions.quantitative]}
                            value={count}
                            onChange={(e) => handleDistributionChange(
                              categoryKey as keyof typeof questionCriteria.distribution,
                              difficulty as keyof typeof categoryData,
                              parseInt(e.target.value) || 0
                            )}
                            className="w-16 text-center"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDistributionChange(
                              categoryKey as keyof typeof questionCriteria.distribution,
                              difficulty as keyof typeof categoryData,
                              count + 1
                            )}
                            disabled={count >= availableQuestions[categoryKey as keyof typeof availableQuestions][difficulty as keyof typeof availableQuestions.quantitative]}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500">
                          Available: {availableQuestions[categoryKey as keyof typeof availableQuestions][difficulty as keyof typeof availableQuestions.quantitative]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Question Settings */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="pointsPerQuestion">Points per Question</Label>
                <Input
                  id="pointsPerQuestion"
                  type="number"
                  min="1"
                  max="10"
                  value={questionCriteria.pointsPerQuestion}
                  onChange={(e) => setQuestionCriteria(prev => ({
                    ...prev,
                    pointsPerQuestion: parseInt(e.target.value) || 1
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="timePerQuestion">Time per Question (seconds)</Label>
                <Input
                  id="timePerQuestion"
                  type="number"
                  min="30"
                  max="300"
                  value={questionCriteria.timePerQuestion}
                  onChange={(e) => setQuestionCriteria(prev => ({
                    ...prev,
                    timePerQuestion: parseInt(e.target.value) || 60
                  }))}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Test Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Questions:</span>
                  <Badge variant="secondary" className="ml-2">
                    {getTotalQuestions()}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Total Points:</span>
                  <Badge variant="secondary" className="ml-2">
                    {getTotalQuestions() * questionCriteria.pointsPerQuestion}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Estimated Time:</span>
                  <Badge variant="secondary" className="ml-2">
                    {getTotalTimeEstimate()} min
                  </Badge>
                </div>
              </div>
            </div>
              </>
            )}

            {selectionMode === 'manual' && (
              <div>
                <Label className="text-base font-medium">Selected Questions ({selectedQuestions.length})</Label>
                <p className="text-sm text-gray-500 mb-4">
                  Browse through all available questions and select the ones you want to include in your test.
                </p>
                <QuestionBrowser
                  selectedQuestions={selectedQuestions}
                  onQuestionToggle={handleQuestionToggle}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Test Settings
            </CardTitle>
            <CardDescription>
              Configure how students will experience this test
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allowMultipleAttempts">Allow Multiple Attempts</Label>
                    <p className="text-sm text-gray-500">Students can retake the test</p>
                  </div>
                  <SimpleSwitch
                    id="allowMultipleAttempts"
                    checked={settings.allowMultipleAttempts}
                    onCheckedChange={(checked: boolean) => setSettings(prev => ({
                      ...prev,
                      allowMultipleAttempts: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showResultsImmediately">Show Results Immediately</Label>
                    <p className="text-sm text-gray-500">Display score after submission</p>
                  </div>
                  <SimpleSwitch
                    id="showResultsImmediately"
                    checked={settings.showResultsImmediately}
                    onCheckedChange={(checked: boolean) => setSettings(prev => ({
                      ...prev,
                      showResultsImmediately: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showCorrectAnswers">Show Correct Answers</Label>
                    <p className="text-sm text-gray-500">Reveal answers after submission</p>
                  </div>
                  <SimpleSwitch
                    id="showCorrectAnswers"
                    checked={settings.showCorrectAnswers}
                    onCheckedChange={(checked: boolean) => setSettings(prev => ({
                      ...prev,
                      showCorrectAnswers: checked
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
                    <p className="text-sm text-gray-500">Randomize question order</p>
                  </div>
                  <SimpleSwitch
                    id="shuffleQuestions"
                    checked={settings.shuffleQuestions}
                    onCheckedChange={(checked: boolean) => setSettings(prev => ({
                      ...prev,
                      shuffleQuestions: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="shuffleOptions">Shuffle Options</Label>
                    <p className="text-sm text-gray-500">Randomize answer choices</p>
                  </div>
                  <SimpleSwitch
                    id="shuffleOptions"
                    checked={settings.shuffleOptions}
                    onCheckedChange={(checked: boolean) => setSettings(prev => ({
                      ...prev,
                      shuffleOptions: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="preventBackNavigation">Prevent Back Navigation</Label>
                    <p className="text-sm text-gray-500">Students cannot revisit questions</p>
                  </div>
                  <SimpleSwitch
                    id="preventBackNavigation"
                    checked={settings.preventBackNavigation}
                    onCheckedChange={(checked: boolean) => setSettings(prev => ({
                      ...prev,
                      preventBackNavigation: checked
                    }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={creating || getTotalQuestions() === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {creating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Test
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateScreeningTest;