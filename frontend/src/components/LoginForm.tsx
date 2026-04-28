import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

type Tab = 'login' | 'signup' | 'magic';

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'At least 1 uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'At least 1 lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'At least 1 number', test: (p: string) => /\d/.test(p) },
  { label: 'At least 1 symbol', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

const LoginForm: React.FC = () => {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
    setInfo('');
  };

  const passwordValid = passwordRules.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (tab === 'signup' && !passwordValid) {
      setError('Password does not meet all requirements.');
      return;
    }

    if (tab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (tab === 'login') {
        await authService.login(email, password);
        navigate('/chat');
      } else if (tab === 'signup') {
        await authService.signup(email, password, firstName, lastName);
        setInfo('Account created! Check your email and click the verification link to log in.');
      } else {
        await authService.sendMagicLink(email);
        setInfo('Magic link sent! Check your email inbox.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabLabel = (t: Tab) => (t === 'magic' ? 'Magic Link' : t.charAt(0).toUpperCase() + t.slice(1));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-6">E2E Practice App</h1>

        <div className="flex border-b border-gray-200 mb-6" data-testid="auth-tabs">
          {(['login', 'signup', 'magic'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchTab(t)}
              data-testid={`tab-${t}`}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {error && (
          <div data-testid="error-message" className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {info && (
          <div data-testid="info-message" className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="auth-form" className="space-y-4">
          {tab === 'signup' && (
            <div className="flex gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                data-testid="first-name-input"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                data-testid="last-name-input"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            data-testid="email-input"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {tab !== 'magic' && (
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                data-testid="password-input"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {password.length > 0 && tab === 'signup' && (
                <ul className="mt-2 space-y-1" data-testid="password-rules">
                  {passwordRules.map((rule, i) => {
                    const met = rule.test(password);
                    return (
                      <li key={rule.label} data-testid={`password-rule-${i}`} data-met={met} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-red-500'}`}>
                        <span>{met ? '✓' : '✗'}</span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {tab === 'signup' && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
              data-testid="confirm-password-input"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                confirmPassword.length > 0 && confirmPassword !== password
                  ? 'border-red-400'
                  : 'border-gray-300'
              }`}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            data-testid="submit-button"
            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Please wait...' : tabLabel(tab)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
