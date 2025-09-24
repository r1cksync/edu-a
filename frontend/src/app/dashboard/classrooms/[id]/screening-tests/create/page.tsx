'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateScreeningTest from '@/components/screening-tests/CreateScreeningTest';

export default function CreateScreeningTestPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const handleBack = () => {
    router.push(`/dashboard/classrooms/${classroomId}?tab=screening-tests`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" onClick={handleBack} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Classroom
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Create Screening Test</h1>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateScreeningTest 
          classroomId={classroomId} 
          onBack={handleBack}
        />
      </div>
    </div>
  );
}
