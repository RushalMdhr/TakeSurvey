import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function Dashboard() {
  const [state, setState] = useState({ surveys: [], loading: true, error: '' });

  const loadSurveys = useCallback(async () => {
    try {
      const { data } = await api.get('/surveys');
      setState({ surveys: data.surveys, loading: false, error: '' });
    } catch (requestError) {
      setState({
        surveys: [],
        loading: false,
        error: requestError.response?.data?.message || 'Could not load surveys.'
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/surveys')
      .then(({ data }) => {
        if (active) setState({ surveys: data.surveys, loading: false, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setState({
            surveys: [],
            loading: false,
            error: requestError.response?.data?.message || 'Could not load surveys.'
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function deleteSurvey(survey) {
    if (!window.confirm(`Delete "${survey.title}"?`)) return;
    try {
      await api.delete(`/surveys/${survey._id}`);
      await loadSurveys();
    } catch (requestError) {
      setState((current) => ({
        ...current,
        error: requestError.response?.data?.message || 'Could not delete survey.'
      }));
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 font-sans text-mint-900 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-700">Workspace</p>
          <h1 className="mb-0 text-3xl font-semibold tracking-tight text-mint-900 sm:text-4xl">Your surveys</h1>
        </div>
        <Link
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-mint-700 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-mint-800"
          to="/surveys/new"
        >
          New survey <span aria-hidden="true">+</span>
        </Link>
      </div>

      {state.error && (
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.loading && <p className="py-10 text-center text-sm text-mint-600">Loading...</p>}
      {!state.loading && !state.error && state.surveys.length === 0 && (
        <section className="flex min-h-60 flex-col items-center justify-center gap-4 rounded-2xl border border-mint-100 bg-white p-8 text-center shadow-[0_16px_42px_rgba(29,86,62,0.08)]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-100 text-2xl text-mint-700" aria-hidden="true">+</span>
          <h2 className="mb-0 text-lg font-semibold text-mint-900">Start with a survey</h2>
          <Link
            className="inline-flex min-h-10 items-center rounded-xl bg-mint-700 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-mint-800"
            to="/surveys/new"
          >
            Create survey
          </Link>
        </section>
      )}
      {!state.loading && state.surveys.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-mint-100 bg-white shadow-[0_16px_42px_rgba(29,86,62,0.08)]">
          {state.surveys.map((survey) => (
            <article
              className="relative grid min-h-[88px] grid-cols-1 items-center gap-3 border-b border-mint-100 p-4 transition-all hover:z-10 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(20,184,156,0.08)] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-6 sm:px-6"
              key={survey._id}
            >
              <Link
                className="min-w-0 text-inherit no-underline"
                to={survey.hasResponses
                  ? `/surveys/${survey._id}/analytics`
                  : `/surveys/${survey._id}/edit`}
              >
                <h2 className="mb-1 truncate text-sm font-semibold text-mint-900 transition-colors hover:text-mint-700">
                  {survey.title}
                </h2>
                <p className="mb-0 text-xs text-[#71847b]">
                  {survey.questions.length} questions <span aria-hidden="true">·</span> Updated {new Date(survey.updatedAt).toLocaleDateString()}
                </p>
              </Link>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                survey.status === 'published'
                  ? 'bg-mint-100 text-mint-800'
                  : survey.status === 'closed'
                    ? 'bg-orange-50 text-orange-800'
                    : 'bg-gray-100 text-gray-600'
              }`}>
                {survey.status}
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {survey.hasResponses && (
                  <Link
                    className="inline-flex min-h-9 items-center rounded-lg border border-mint-200 px-3 text-xs font-semibold text-mint-800 no-underline transition-colors hover:bg-mint-50"
                    to={`/surveys/${survey._id}/analytics`}
                  >
                    Analyze
                  </Link>
                )}
                {survey.status === 'published' && (
                  <a
                    className="grid h-9 w-9 place-items-center rounded-lg text-mint-700 no-underline transition-colors hover:bg-mint-50"
                    href={`/s/${encodeURIComponent(survey.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${survey.title}`}
                    title="Open public survey"
                  >
                    ↗
                  </a>
                )}
                <Link
                  className="inline-flex min-h-9 items-center rounded-lg border border-mint-200 px-3 text-xs font-semibold text-mint-800 no-underline transition-colors hover:bg-mint-50"
                  to={`/surveys/${survey._id}/edit`}
                >
                  Edit
                </Link>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg text-lg text-[#71847b] transition-colors hover:bg-red-50 hover:text-red-600"
                  type="button"
                  onClick={() => deleteSurvey(survey)}
                  aria-label={`Delete ${survey.title}`}
                  title="Delete survey"
                >
                  ×
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}