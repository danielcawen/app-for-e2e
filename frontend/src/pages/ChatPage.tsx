import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ChatInterface from '../components/ChatInterface';

/**
 * ChatPage component.
 * Acts as the main container for the chat interface and enforces
 * authentication by redirecting unauthenticated users to the login page.
 */
const ChatPage: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If authentication is finished and there is no user, redirect to login
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect is handled by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ChatInterface onLogout={logout} user={user} />
    </div>
  );
};

export default ChatPage;
