import React, { useState } from 'react';
import { User } from '../types';
import Button from './Button';
import Icon from './Icon';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    try {
        const users = JSON.parse(localStorage.getItem('users') || '{}');

        if (isLoginView) {
            // Login logic
            const userAccount = users[email];
            if (userAccount && userAccount.password === password) {
                onLoginSuccess({ email, ...userAccount });
                onClose();
            } else {
                setError('Invalid email or password.');
            }
        } else {
            // Signup logic
            if (users[email]) {
                setError('An account with this email already exists.');
                return;
            }
            const newUser = { password, profilePic: '', history: [] };
            users[email] = newUser;
            localStorage.setItem('users', JSON.stringify(users));
            onLoginSuccess({ email, ...newUser });
            onClose();
        }
    } catch (e) {
        console.error("Auth error:", e);
        setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-8 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <Icon name="close" className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-center mb-2 text-indigo-400">{isLoginView ? 'Welcome Back!' : 'Create Account'}</h2>
        <p className="text-center text-gray-400 mb-6">{isLoginView ? 'Sign in to continue.' : 'Get started with your new account.'}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required 
            />
          </div>
          
          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <Button type="submit" variant="primary" className="w-full !py-3 !text-base">
            {isLoginView ? 'Login' : 'Sign Up'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          {isLoginView ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-indigo-400 hover:underline ml-1">
            {isLoginView ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
