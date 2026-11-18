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
    <main className="page-container">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Your surveys</h1>
        </div>
        <Link className="primary-button" to="/surveys/new">New survey <span aria-hidden="true">+</span></Link>
      </div>

      {state.error && <p className="notice notice-error" role="alert">{state.error}</p>}
      {state.loading && <p className="quiet-state">Loading...</p>}
      {!state.loading && !state.error && state.surveys.length === 0 && (
        <section className="empty-card">
          <span className="empty-mark" aria-hidden="true">+</span>
          <h2>Start with a survey</h2>
          <Link className="primary-button" to="/surveys/new">Create survey</Link>
        </section>
      )}
      {!state.loading && state.surveys.length > 0 && (
        <div className="survey-list">
          {state.surveys.map((survey) => (
            <article className="survey-row" key={survey._id}>
              <div className="survey-row-main">
                <h2>{survey.title}</h2>
                <p>{survey.questions.length} questions <span aria-hidden="true">·</span> Updated {new Date(survey.updatedAt).toLocaleDateString()}</p>
              </div>
              <span className={`status-pill status-${survey.status}`}>{survey.status}</span>
              <div className="row-actions">
                <Link
                  className="icon-link analytics-link"
                  to={`/surveys/${survey._id}/analytics`}
                  aria-label={`Show analysis for ${survey.title}`}
                  title="Show analysis"
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M3 16.5h14M5.5 14V9.5M10 14V4M14.5 14V7" />
                  </svg>
                </Link>
                {survey.status === 'published' && (
                  <a
                    className="icon-link"
                    href={`/s/${encodeURIComponent(survey.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${survey.title}`}
                    title="Open public survey"
                  >
                    ↗
                  </a>
                )}
                <Link className="secondary-button" to={`/surveys/${survey._id}/edit`}>Edit</Link>
                <button
                  className="icon-button danger-button"
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