import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';

function TextAnswers({ surveyId, question }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({
    page: null,
    answers: [],
    totalAnswers: 0,
    totalPages: 0,
    loading: true,
    error: ''
  });

  useEffect(() => {
    let active = true;
    api.get(`/analytics/surveys/${surveyId}/questions/${encodeURIComponent(question.questionId)}/text`, {
      params: { page, limit: 10 }
    })
      .then(({ data }) => {
        if (active) setResult({ ...data, loading: false, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setResult((current) => ({
            ...current,
            page,
            loading: false,
            error: requestError.response?.data?.message || 'Could not load text answers.'
          }));
        }
      });

    return () => {
      active = false;
    };
  }, [page, question.questionId, surveyId]);

  const loading = result.page !== page || result.loading;

  return (
    <div className="text-answer-panel">
      {result.error && <p className="analytics-error" role="alert">{result.error}</p>}
      {loading ? (
        <p className="analytics-muted">Loading answers...</p>
      ) : result.answers.length === 0 ? (
        <p className="analytics-muted">No text responses yet</p>
      ) : (
        <>
          <div className="text-answer-list">
            {result.answers.map((answer) => (
              <article className="text-answer" key={answer.responseId}>
                <p>{answer.text}</p>
                <time dateTime={answer.submittedAt}>
                  {new Date(answer.submittedAt).toLocaleDateString()}
                </time>
              </article>
            ))}
          </div>
          {result.totalPages > 1 && (
            <div className="pagination">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </button>
              <span>{page} / {result.totalPages}</span>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))}
                disabled={page >= result.totalPages || loading}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BarChart({ distribution, labelKey }) {
  return (
    <div className="analytics-bars">
      {distribution.map((item) => (
        <div className="analytics-bar-row" key={item.optionId || item.value}>
          <div className="analytics-bar-label">
            <span>{item[labelKey]}</span>
            <strong>{item.count}</strong>
          </div>
          <div
            className="analytics-bar-track"
            role="img"
            aria-label={`${item[labelKey]}: ${item.count} responses, ${item.percentage}%`}
          >
            <span style={{ width: `${item.percentage}%` }} />
          </div>
          <span className="analytics-percentage">{item.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

function QuestionResults({ surveyId, question }) {
  const progress = question.shownCount
    ? Math.round((question.answeredCount / question.shownCount) * 100)
    : 0;

  return (
    <article className="analytics-question">
      <header className="analytics-question-heading">
        <div>
          <p className="eyebrow">{question.type.replaceAll('_', ' ')}</p>
          <h2>{question.label}</h2>
        </div>
        <div className="answer-summary">
          <strong>{question.answeredCount}<span> / {question.shownCount}</span></strong>
          <small>answered · {progress}%</small>
        </div>
      </header>

      {question.type === 'text' ? (
        <TextAnswers surveyId={surveyId} question={question} />
      ) : question.type === 'rating' ? (
        <>
          <div className="rating-average">
            <strong>{question.average ?? '—'}</strong>
            <span>average / 5</span>
          </div>
          <BarChart distribution={question.distribution} labelKey="value" />
        </>
      ) : (
        <>
          {question.type === 'multi_choice' && (
            <p className="analytics-hint">Respondents could choose more than one</p>
          )}
          <BarChart distribution={question.distribution} labelKey="label" />
        </>
      )}

      <footer className="analytics-question-footer">
        {question.unansweredCount} unanswered
      </footer>
    </article>
  );
}

export default function SurveyAnalytics() {
  const { id } = useParams();
  const [state, setState] = useState({
    id: null,
    analytics: null,
    loading: true,
    error: ''
  });

  useEffect(() => {
    let active = true;
    api.get(`/analytics/surveys/${id}`)
      .then(({ data }) => {
        if (active) setState({ id, analytics: data, loading: false, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setState({
            id,
            analytics: null,
            loading: false,
            error: requestError.response?.data?.message || 'Could not load survey analysis.'
          });
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const loading = state.id !== id || state.loading;
  const error = state.id === id ? state.error : '';
  const analytics = state.id === id ? state.analytics : null;

  if (loading) {
    return <main className="page-container"><p className="quiet-state">Loading analysis...</p></main>;
  }

  if (error || !analytics) {
    return (
      <main className="page-container">
        <p className="notice notice-error" role="alert">{error || 'Analysis unavailable.'}</p>
        <Link className="secondary-button" to="/dashboard">Back to surveys</Link>
      </main>
    );
  }

  return (
    <main className="page-container analytics-page">
      <Link className="back-link" to="/dashboard">← Surveys</Link>
      <div className="page-heading analytics-heading">
        <div>
          <p className="eyebrow">Survey analysis</p>
          <h1>{analytics.survey.title}</h1>
        </div>
        <Link className="secondary-button" to={`/surveys/${id}/edit`}>Edit survey</Link>
      </div>

      <section className="analytics-total-card">
        <span className="total-icon" aria-hidden="true">↗</span>
        <div>
          <strong>{analytics.totalResponses}</strong>
          <span>total responses</span>
        </div>
        <Link className="text-button" to={`/s/${encodeURIComponent(analytics.survey.slug)}`} target="_blank">
          Open public survey
        </Link>
      </section>

      {analytics.totalResponses === 0 && (
        <p className="analytics-empty-notice">No responses yet. Share your survey to get started.</p>
      )}

      <section className="analytics-question-list">
        {analytics.questions.map((question) => (
          <QuestionResults key={question.questionId} surveyId={id} question={question} />
        ))}
      </section>
    </main>
  );
}