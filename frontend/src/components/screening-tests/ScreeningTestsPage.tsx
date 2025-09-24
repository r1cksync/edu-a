'use client';

import React, { useState } from 'react';
import ScreeningTestList from './ScreeningTestList';
import CreateScreeningTest from './CreateScreeningTest';
import AnalyticsDashboard from './AnalyticsDashboard';

interface ScreeningTestsPageProps {
  classroomId: string;
  userRole: 'student' | 'teacher';
}

const ScreeningTestsPage: React.FC<ScreeningTestsPageProps> = ({ classroomId, userRole }) => {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'analytics'>('list');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const handleViewChange = (view: 'list' | 'create' | 'analytics', attemptId?: string) => {
    setCurrentView(view);
    if (attemptId) {
      setSelectedAttemptId(attemptId);
    }
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedAttemptId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'list' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <ScreeningTestList classroomId={classroomId} />
        </div>
      )}
      
      {currentView === 'create' && userRole === 'teacher' && (
        <CreateScreeningTest 
          classroomId={classroomId} 
          onBack={handleBackToList}
        />
      )}
      
      {currentView === 'analytics' && selectedAttemptId && (
        <AnalyticsDashboard 
          attemptId={selectedAttemptId}
          userRole={userRole}
          onBack={handleBackToList}
        />
      )}
    </div>
  );
};

export default ScreeningTestsPage;