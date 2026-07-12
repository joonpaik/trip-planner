import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import '../index.css';
import { authService } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, newPassword);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-200 to-blue-400"
      style={{ background: 'linear-gradient(135deg, #fffbeb, #ffe4c7)' }}
    >
      <div className="bg-white rounded-xl shadow-lg sm:w-1/2 md:w-1/2 lg:w-1/3 p-8">
        {status === 'success' ? (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Password Reset
            </h2>
            <p className="text-gray-600 mb-6">
              Your password has been reset. You can now log in with your new
              password.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl text-center font-bold mb-6">
              Choose a New Password
            </h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-2 text-center">
                {error}
              </div>
            )}

            {!token && (
              <p className="text-center text-red-600 mb-4">
                This link is missing a reset token.
              </p>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
              placeholder="confirm new password"
            />

            <button
              onClick={handleSubmit}
              disabled={isLoading || !token}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>

            <p className="mt-4 text-center text-sm text-gray-600">
              <Link to="/login" className="text-blue-500 hover:underline">
                Back to Sign In
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
