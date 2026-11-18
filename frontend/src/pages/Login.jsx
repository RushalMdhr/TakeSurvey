import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setWorking(true);

    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email, password }
        : { name, email, password };
      const { data } = await api.post(path, payload);
      localStorage.setItem('token', data.token);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not sign in.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" to="/login">
        <span className="brand-mark">t</span>
        <span>takesurvey</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Get started'}</p>
        <h1>{mode === 'login' ? 'Your surveys, simply.' : 'Create your workspace.'}</h1>
        <form className="stack-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Name
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength="6"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button full-button" type="submit" disabled={working}>
            {working ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          className="text-button auth-switch"
          type="button"
          onClick={() => {
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? 'Create an admin account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}