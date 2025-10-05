import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api';

import { 
  Send, 
  Bot, 
  User, 
  Paperclip, 
  X, 
  Check,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Question {
  _id?: string;
  question: {
    _id: string;
    question: string;
    category: string;
    difficulty: string;
    correctAnswer: string;
    points: number;
  };
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  confidence: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachedQuestions?: Question[];
}

interface AITestChatProps {
  attemptId: string;
  questions: Question[];
}

const AITestChat: React.FC<AITestChatProps> = ({ attemptId, questions }) => {
  console.log('AITestChat props:', { attemptId, questionsLength: questions?.length });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to safely extract question text
  const getQuestionText = (questionAttempt: any): string => {
    // Handle nested structure from questionAttempts
    if (questionAttempt && questionAttempt.question && typeof questionAttempt.question.question === 'string') {
      return questionAttempt.question.question;
    }
    // Handle direct question object
    if (questionAttempt && typeof questionAttempt.question === 'string') {
      return questionAttempt.question;
    }
    // Handle string directly
    if (typeof questionAttempt === 'string') {
      return questionAttempt;
    }
    return String(questionAttempt || 'Question text not available');
  };

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm your AI tutor and I'm here to help you understand your test performance. I have access to all your answers, performance data, and can explain any questions you struggled with. Feel free to ask me anything about your test results or specific questions!

Some things you can ask me:
• "Why did I get question X wrong?"
• "How can I improve in the quantitative section?"
• "What concepts should I study more?"
• "Explain the correct approach for this problem"

You can also attach specific questions to your message for detailed explanations.`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && selectedQuestions.length === 0) return;
    
    if (!attemptId) {
      console.error('Attempt ID is missing:', attemptId);
      return;
    }

    const attachedQuestionsData = selectedQuestions.map(qId => 
      questions.find(q => q.question._id === qId)
    ).filter(Boolean) as Question[];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      attachedQuestions: attachedQuestionsData,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSelectedQuestions([]);
    setShowQuestionSelector(false);
    setIsLoading(true);

    try {
      console.log('Sending to AI:', { attemptId, inputMessage, selectedQuestions });
      const data = await apiClient.chatWithAI(attemptId, inputMessage, selectedQuestions) as any;

      if (data.success) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.message || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          AI Tutor Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && (
                      <Bot className="w-4 h-4 mt-1 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User className="w-4 h-4 mt-1 flex-shrink-0 text-blue-100" />
                    )}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      
                      {/* Attached Questions */}
                      {message.attachedQuestions && message.attachedQuestions.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <div className="text-xs opacity-75">Attached Questions:</div>
                          {message.attachedQuestions.map((q, index) => (
                            <div key={q.question._id} className="bg-black/10 rounded p-2 text-xs">
                              <div className="font-medium">Q{index + 1}: {getQuestionText(q).substring(0, 100)}...</div>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {q.question.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {q.question.difficulty}
                                </Badge>
                                <Badge 
                                  variant={q.isCorrect ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {q.isCorrect ? 'Correct' : 'Incorrect'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-xs opacity-75 mt-1">
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Question Selector */}
        {showQuestionSelector && (
          <div className="border-t p-4 max-h-48 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm">Select questions to attach:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuestionSelector(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.question._id} className="flex items-start gap-2 p-2 border rounded text-sm">
                  <Checkbox
                    checked={selectedQuestions.includes(question.question._id)}
                    onCheckedChange={() => toggleQuestionSelection(question.question._id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium">Q{index + 1}: {getQuestionText(question).substring(0, 80)}...</div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {question.question.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {question.question.difficulty}
                      </Badge>
                      <Badge 
                        variant={question.isCorrect ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {question.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t p-4">
          {selectedQuestions.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Paperclip className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {selectedQuestions.length} question(s) attached
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedQuestions.map(qId => {
                  const question = questions.find(q => q.question._id === qId);
                  return question ? (
                    <Badge key={qId} variant="secondary" className="text-xs">
                      Q{questions.indexOf(question) + 1}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-auto p-0"
                        onClick={() => toggleQuestionSelection(qId)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuestionSelector(!showQuestionSelector)}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your test performance..."
              className="flex-1 min-h-[40px] max-h-[100px] resize-none"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isLoading || (!inputMessage.trim() && selectedQuestions.length === 0)}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AITestChat;