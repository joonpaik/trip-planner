import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import '../index.css';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [errorMessage, setErrorMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Missing verification token.');
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    const verify = async () => {
      try {
        await authService.verifyEmail(token);
        if (user) {
          await refreshUser();
        }
        setStatus('success');
      } catch (error) {
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Verification failed'
        );
      }
    };

    verify();
  }, [searchParams, user, refreshUser]);

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-200 to-blue-400"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <div className="bg-white rounded-xl shadow-lg sm:w-1/2 md:w-1/2 lg:w-1/3 p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Email Verified
            </h2>
            <p className="text-gray-600 mb-6">
              Your email has been verified. You can now access your account.
            </p>
            <button
              onClick={() => navigate(user ? '/' : '/login')}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              {user ? 'Continue' : 'Go to Login'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-red-600 mb-6">{errorMessage}</p>
            <Link
              to="/login"
              className="text-blue-500 hover:underline font-medium"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
