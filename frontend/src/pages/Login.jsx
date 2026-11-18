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
    <main className="grid min-h-screen place-items-center bg-mint-50 px-5 py-8 font-sans text-mint-900">
      <Link
        className="absolute left-6 top-6 inline-flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-mint-900 no-underline sm:left-8 sm:top-7"
        to="/login"
      >
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-mint-200 text-[19px] font-extrabold text-mint-800">
          t
        </span>
        <span>takesurvey</span>
      </Link>
      <section className="w-full max-w-[420px] rounded-[18px] border border-mint-100 bg-white p-7 shadow-[0_16px_42px_rgba(29,86,62,0.08)] sm:p-[34px]">
        <p className="mb-0 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-700">
          {mode === 'login' ? 'Welcome back' : 'Get started'}
        </p>
        <h1 className="mb-6 mt-2 text-[29px] font-semibold tracking-tight text-mint-900">
          {mode === 'login' ? 'Your surveys, simply.' : 'Create your workspace.'}
        </h1>
        <form className="grid gap-4" onSubmit={submit}>
          {mode === 'register' && (
            <label className="grid gap-2 text-xs font-semibold text-mint-900">
              Name
              <input
                className="w-full rounded-lg border border-mint-200 bg-white px-3 py-2.5 text-sm font-normal text-mint-900 outline-none placeholder:text-mint-300 focus:border-mint-400 focus:ring-2 focus:ring-mint-300/40"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}
          <label className="grid gap-2 text-xs font-semibold text-mint-900">
            Email
            <input
              className="w-full rounded-lg border border-mint-200 bg-white px-3 py-2.5 text-sm font-normal text-mint-900 outline-none placeholder:text-mint-300 focus:border-mint-400 focus:ring-2 focus:ring-mint-300/40"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-mint-900">
            Password
            <input
              className="w-full rounded-lg border border-mint-200 bg-white px-3 py-2.5 text-sm font-normal text-mint-900 outline-none placeholder:text-mint-300 focus:border-mint-400 focus:ring-2 focus:ring-mint-300/40"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength="6"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            className="min-h-11 w-full rounded-xl bg-mint-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mint-800 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={working}
          >
            {working ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <button
          className="mt-5 border-0 bg-transparent p-0 text-sm font-semibold text-mint-700 transition-colors hover:text-mint-900"
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