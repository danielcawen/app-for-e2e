import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';

/**
 * App component.
 * The main entry point for the React application.
 * Sets up the routing structure using React Router.
 */
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/chat" element={<ChatPage />} />

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/chat" replace />} />

        {/* 404 Not Found */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-indigo-600">404</h1>
              <p className="text-xl text-gray-600 mt-4">
                Page Not Found
              </p>
              <button
                onClick={() => window.location.href = '/chat'}
                className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Go back to Chat
              </button>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
};

export default App;
