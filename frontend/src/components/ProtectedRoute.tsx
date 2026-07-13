import React, { ReactNode, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../pages/Login';
import Home from '../pages/Home';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

const VerifyEmailGate: React.FC = () => {
  const { user, logout } = useAuth();
  const [resendStatus, setResendStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleResend = async () => {
    if (!user) return;
    setResendStatus('sending');
    try {
      await authService.resendVerification(user.email);
      setResendStatus('sent');
    } catch (error) {
      setResendStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to resend email'
      );
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <div className="bg-white rounded-xl shadow-lg sm:w-1/2 md:w-1/2 lg:w-1/3 p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Verify Your Email
        </h2>
        <p className="text-gray-600 mb-6">
          We sent a verification link to <strong>{user?.email}</strong>.
          Please check your inbox and click the link to continue.
        </p>

        {resendStatus === 'sent' ? (
          <p className="text-green-600 mb-4">Verification email resent.</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendStatus === 'sending'}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300 disabled:opacity-50"
          >
            {resendStatus === 'sending'
              ? 'Sending...'
              : 'Resend Verification Email'}
          </button>
        )}
        {resendStatus === 'error' && (
          <p className="text-red-600 mt-2">{errorMessage}</p>
        )}

        <button
          onClick={() => logout()}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 hover:underline"
        >
          Log Out
        </button>
      </div>
    </div>
  );
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_verified) {
    return <VerifyEmailGate />;
  }

  return <>{children}</>;
};
