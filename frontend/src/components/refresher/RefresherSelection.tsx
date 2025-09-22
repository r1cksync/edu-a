'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  BookOpen,
  Target,
  Calendar,
  TrendingDown,
  Brain,
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface RefresherSelectionProps {
  classroomId: string
  onSessionStarted: (sessionId: string) => void
  onBack: () => void
}

interface DPPSubmission {
  submissionId: string
  dpp: {
    id: string
    title: string
    description: string
    type: string
    maxScore: number
    createdAt: string
  }
  submissionStats: {
    score: number
    totalQuestions: number
    incorrectCount: number
    accuracy: number
    submittedAt: string
  }
  canUseForRefresher: boolean
}

export default function RefresherSelection({ classroomId, onSessionStarted, onBack }: RefresherSelectionProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [questionsPerBatch, setQuestionsPerBatch] = useState(5)

  // Get available DPPs for refresher
  const { data: availableDPPs, isLoading } = useQuery({
    queryKey: ['available-dpps-refresher', classroomId],
    queryFn: () => apiClient.getAvailableDPPsForRefresher(classroomId)
  })

  // Start refresher session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (data: { submissionId: string; questionsPerBatch: number }) => {
      return apiClient.startRefresherSession(classroomId, data)
    },
    onSuccess: (response: any) => {
      toast({
        title: "Refresher Session Started!",
        description: `AI has generated ${response.data.currentBatch.questionsCount} questions based on your mistakes.`
      })
      onSessionStarted(response.data.sessionId)
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start Session",
        description: error.message || "Please try again later.",
        variant: "destructive"
      })
    }
  })

  const dpps = (availableDPPs as any)?.data?.availableDPPs || []
  const selectedDPP = dpps.find((dpp: DPPSubmission) => dpp.submissionId === selectedSubmission)

  const handleStartSession = () => {
    if (!selectedSubmission) {
      toast({
        title: "Select a DPP",
        description: "Please select a DPP to practice with.",
        variant: "destructive"
      })
      return
    }

    if (questionsPerBatch < 1 || questionsPerBatch > 20) {
      toast({
        title: "Invalid Question Count",
        description: "Please select between 1 and 20 questions per batch.",
        variant: "destructive"
      })
      return
    }

    startSessionMutation.mutate({
      submissionId: selectedSubmission,
      questionsPerBatch
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Select DPP for Practice</h2>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading your completed DPPs...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Select DPP for Practice</h2>
          <p className="text-gray-600">Choose a DPP where you made mistakes to practice with AI-generated questions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DPP Selection */}
        <div className="lg:col-span-2 space-y-4">
          {dpps.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No DPPs Available</h3>
                <p className="text-gray-600">
                  You need to complete some DPPs with incorrect answers first.<br />
                  Only DPPs where you made mistakes can be used for refresher practice.
                </p>
              </CardContent>
            </Card>
          ) : (
            dpps.map((dpp: DPPSubmission) => (
              <Card 
                key={dpp.submissionId}
                className={`cursor-pointer transition-all ${
                  selectedSubmission === dpp.submissionId 
                    ? 'ring-2 ring-purple-500 bg-purple-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedSubmission(dpp.submissionId)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{dpp.dpp.title}</h3>
                          <p className="text-sm text-gray-600">{dpp.dpp.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Target className="h-3 w-3 mr-1" />
                          {dpp.submissionStats.totalQuestions} questions
                        </div>
                        <div className="flex items-center">
                          <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                          {dpp.submissionStats.incorrectCount} mistakes
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(dpp.submissionStats.submittedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <Badge 
                        variant="secondary"
                        className={
                          dpp.submissionStats.accuracy >= 70 
                            ? 'bg-green-100 text-green-800'
                            : dpp.submissionStats.accuracy >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {dpp.submissionStats.accuracy.toFixed(1)}% accuracy
                      </Badge>
                      <p className="text-sm text-gray-600">
                        Score: {dpp.submissionStats.score}/{dpp.dpp.maxScore}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Session Settings</span>
              </CardTitle>
              <CardDescription>
                Configure your refresher practice session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="questions-per-batch">Questions per batch</Label>
                <Input
                  id="questions-per-batch"
                  type="number"
                  min="1"
                  max="20"
                  value={questionsPerBatch}
                  onChange={(e) => setQuestionsPerBatch(parseInt(e.target.value) || 5)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Number of questions to practice at once (1-20)
                </p>
              </div>

              {selectedDPP && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <h4 className="font-medium text-gray-900">Selected DPP</h4>
                  <p className="text-sm text-gray-600">{selectedDPP.dpp.title}</p>
                  <p className="text-xs text-gray-500">
                    AI will generate questions based on your {selectedDPP.submissionStats.incorrectCount} mistakes
                  </p>
                </div>
              )}

              <Button 
                onClick={handleStartSession}
                disabled={!selectedSubmission || startSessionMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {startSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Session...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Start AI Practice
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">How it works</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-gray-600">
              <p>• AI analyzes your incorrect answers</p>
              <p>• Generates targeted practice questions</p>
              <p>• Adapts difficulty based on your performance</p>
              <p>• You can request more questions anytime</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}