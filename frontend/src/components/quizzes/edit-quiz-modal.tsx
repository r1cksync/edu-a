'use client'

import { X } from 'lucide-react'

interface Quiz {
  _id: string
  title: string
  description: string
  status: string
}

interface EditQuizModalProps {
  quiz: Quiz
  onClose: () => void
  onSuccess: () => void
}

export default function EditQuizModal({ quiz, onClose, onSuccess }: EditQuizModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Quiz: {quiz.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Quiz editing interface will be implemented in the next phase.</p>
          <p className="text-sm text-gray-500 mb-6">
            Currently, you can create new quizzes. Full editing capabilities including 
            question modification, scheduling changes, and proctoring settings will be available soon.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}