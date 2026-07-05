import React from 'react';
import SimplePhotoCapture from '../components/SimplePhotoCapture';

const CameraTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Camera Test Page
        </h1>
        <div className="bg-white rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">
            Test Webcam Photo Capture for Chore Analysis
          </h2>
          <SimplePhotoCapture />
        </div>
        <p className="text-center text-gray-500 mt-6">
          This page tests the webcam photo capture functionality.
          Captured photos are sent to your backend AI analysis endpoint.
        </p>
      </div>
    </div>
  );
};

export default CameraTestPage;