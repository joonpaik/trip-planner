import React, { useState, useEffect } from 'react';
import '../index.css';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Lock, Code, Play, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    'login' | 'register' | 'forgotPassword'
  >('login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstname: '',
    lastname: '',
    email: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.username || !formData.password) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (
      currentView === 'register' &&
      (!formData.firstname.trim() || !formData.lastname.trim())
    ) {
      setError('Name is required for registration');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      if (currentView === 'login') {
        console.log('Logging in with', formData);
        const response = await login(formData.username, formData.password);
        if (response && response.access_token) {
          console.log('Login successful', response.user);
          navigate('/');
        }
      } else if (currentView === 'register') {
        // TODO: Email verificaiotn
        // Send Register Post Request
        console.log('Registering with', formData);
        const response = await register(
          formData.username,
          formData.password,
          formData.firstname,
          formData.lastname,
          formData.email
        );

        if (response && response.access_token) {
          console.log('Registration successful', response.user);
          navigate('/');
        }
      } else {
        // Handle forgot password logic here
        console.log('Forgot Password for', formData.username);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Authentication failed: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    if (error) {
      setError('');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      firstname: '',
      lastname: '',
      email: '',
    });
    setError('');
    setSuccess('');
    setShowPassword(false);
  };

  const switchView = (
    view: React.SetStateAction<'login' | 'register' | 'forgotPassword'>
  ) => {
    setCurrentView(view);
    resetForm();
  };

  const getTitle = () => {
    switch (currentView) {
      case 'login':
        return 'Welcome Back';
      case 'register':
        return 'Create Account';
      case 'forgotPassword':
        return 'Reset Password';
      default:
        return 'Authentication';
    }
  };

  const getSubtitle = () => {
    switch (currentView) {
      case 'login':
        return 'Sign in to your account';
      case 'register':
        return 'Sign up for a new account';
      case 'forgotPassword':
        return 'Enter your email to receive a reset link';
      default:
        return '';
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      switch (currentView) {
        case 'login':
          return 'Signing In...';
        case 'register':
          return 'Creating Account...';
        case 'forgotPassword':
          return 'Sending Reset Link...';
        default:
          return 'Processing...';
      }
    }
    switch (currentView) {
      case 'login':
        return 'Sign In';
      case 'register':
        return 'Create Account';
      case 'forgotPassword':
        return 'Send Reset Link';
      default:
        return 'Submit';
    }
  };

  // Three views for login, register, and forgot password
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-200 to-blue-400"
      style={{ background: 'linear-gradient(#A7E3E0, #14f2e7ff)' }}
    >
      <div className="bg-white rounded-xl shadow-lg sm:w-1/2 md:w-1/2 lg:w-1/4 p-6 items-center ">
        {/* Log In Form */}
        {currentView === 'login' && (
          <div>
            <h2 className="text-xl text-center font-bold">Welcome Back</h2>
            <label className="block text-md font-medium text-gray-700 mb-2 text-center">
              Please login into your account
            </label>

            <br></br>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit(event);
                }
              }}
              required
              className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="username or email"
            />
            <br></br>
            <br></br>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSubmit(event);
                  }
                }}
                required
                className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="password"
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

            <div className="flex justify-end mt-4">
              <button
                onClick={() => switchView('forgotPassword')}
                className="text-sm text-blue-500 hover:underline justify-end mt-2"
              >
                Forgot Password?
              </button>
            </div>
            <br></br>
            <button
              onClick={handleSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit(event);
                }
              }}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              {getButtonText()}
            </button>
            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => switchView('register')}
                className="text-blue-500 hover:underline"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}

        {/* Sign Up Form */}
        {currentView === 'register' && (
          <div>
            <h2 className="text-xl text-center font-bold">Create Account</h2>
            <label className="block text-md font-medium text-gray-700 mb-2 text-center">
              Please fill in the information below
            </label>
            <br></br>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit(event);
                }
              }}
              required
              className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email"
            />

            <br></br>
            <br></br>

            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="firstname"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmit(event);
                    }
                  }}
                  required
                  className="w-full pl-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="lastname"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmit(event);
                    }
                  }}
                  required
                  className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="last name"
                />
              </div>
            </div>

            <br></br>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit(event);
                }
              }}
              required
              className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="username"
            />
            <br></br>
            <br></br>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSubmit(event);
                  }
                }}
                required
                className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="password"
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

            <br></br>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit(event);
                }
              }}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              {getButtonText()}
            </button>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => switchView('login')}
                className="text-blue-500 hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* Forgot Password Form */}
        {currentView === 'forgotPassword' && (
          <div>
            <h2 className="text-xl text-center font-bold">Reset Password</h2>
            <label className="block text-md font-medium text-gray-700 mb-2 text-center">
              Enter your email to receive a reset link
            </label>

            <br></br>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit(event);
                }
              }}
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full pl-5 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email"
            />
            <br></br>
            <br></br>
            <button
              onClick={handleSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleSubmit(event);
                }
              }}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-300"
            >
              {getButtonText()}
            </button>
            <p className="mt-4 text-center text-sm text-gray-600">
              Back to{' '}
              <button
                onClick={() => switchView('login')}
                className="text-blue-500 hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

{
  /* <div className="min-h-screen">
      <h1 className="font-bold text-center">Home Page</h1>
      <div className="grid place-items-center">
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 p-4 w-1/2 border-4 border-black">
          {userTasks
            .filter((item, index) => index < 3)
            .map((card, index) => (
              <AnimationWrapper key={index} delay={(index + 3) * 150}>
                <Card
                  title={card.title}
                  description={card.description}
                  bgColor="bg-white"
                />
              </AnimationWrapper>
            ))}
        </div>
      </div>
    </div> */
}
