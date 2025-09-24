'use client';

import { useParams } from 'next/navigation';
import TakeScreeningTest from '@/components/screening-tests/TakeScreeningTest';

export default function ScreeningTestPage() {
  const params = useParams();
  const attemptId = params.attemptId as string;

  if (!attemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Test</h1>
          <p className="text-gray-600">No test attempt ID provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TakeScreeningTest attemptId={attemptId} />
    </div>
  );
}