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
    <div className="mt-5">
      {result.error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {result.error}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-[#71847b]">Loading answers...</p>
      ) : result.answers.length === 0 ? (
        <p className="text-sm text-[#71847b]">No text responses yet</p>
      ) : (
        <>
          <div className="grid gap-3">
            {result.answers.map((answer) => (
              <article className="rounded-xl border border-mint-100 bg-mint-50/50 p-4" key={answer.responseId}>
                <p className="mb-3 whitespace-pre-wrap text-sm text-mint-900">{answer.text}</p>
                <time className="text-xs text-[#71847b]" dateTime={answer.submittedAt}>
                  {new Date(answer.submittedAt).toLocaleDateString()}
                </time>
              </article>
            ))}
          </div>
          {result.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                className="rounded-lg border border-mint-200 px-3 py-2 text-xs font-semibold text-mint-800 transition-colors hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </button>
              <span className="text-xs text-[#71847b]">{page} / {result.totalPages}</span>
              <button
                className="rounded-lg border border-mint-200 px-3 py-2 text-xs font-semibold text-mint-800 transition-colors hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="grid gap-4">
      {distribution.map((item) => (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2" key={item.optionId || item.value}>
          <div className="col-span-2 flex items-center justify-between text-sm text-mint-700">
            <span>{item[labelKey]}</span>
            <strong className="font-semibold">{item.count}</strong>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-mint-100"
            role="img"
            aria-label={`${item[labelKey]}: ${item.count} responses, ${item.percentage}%`}
          >
            <span className="block h-full rounded-full bg-mint-400" style={{ width: `${item.percentage}%` }} />
          </div>
          <span className="min-w-10 text-right text-xs font-medium text-mint-600">{item.percentage}%</span>
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
    <article className="rounded-2xl border border-mint-100 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-600">
            {question.type.replaceAll('_', ' ')}
          </p>
          <h2 className="mb-0 break-words text-lg font-semibold text-mint-900">{question.label}</h2>
        </div>
        <div className="shrink-0 text-right">
          <strong className="block text-lg font-semibold text-mint-800">
            {question.answeredCount}<span className="font-normal text-[#71847b]"> / {question.shownCount}</span>
          </strong>
          <small className="text-xs text-[#71847b]">answered · {progress}%</small>
        </div>
      </header>

      {question.type === 'text' ? (
        <TextAnswers surveyId={surveyId} question={question} />
      ) : question.type === 'rating' ? (
        <>
          <div className="mb-5 flex items-baseline gap-2">
            <strong className="text-3xl font-bold text-mint-800">{question.average ?? '—'}</strong>
            <span className="text-sm text-[#71847b]">average / 5</span>
          </div>
          <BarChart distribution={question.distribution} labelKey="value" />
        </>
      ) : (
        <>
          {question.type === 'multi_choice' && (
            <p className="mb-4 text-xs text-[#71847b]">Respondents could choose more than one</p>
          )}
          <BarChart distribution={question.distribution} labelKey="label" />
        </>
      )}

      <footer className="mt-5 border-t border-mint-100 pt-4 text-xs text-[#71847b]">
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
    return (
      <main className="mx-auto max-w-6xl px-5 py-12 font-sans text-mint-900 sm:px-8">
        <p className="py-10 text-center text-sm text-[#71847b]">Loading analysis...</p>
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-12 font-sans text-mint-900 sm:px-8">
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600" role="alert">
          {error || 'Analysis unavailable.'}
        </p>
        <Link className="text-sm font-semibold text-mint-700 hover:text-mint-900" to="/dashboard">
          Back to surveys
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 font-sans text-mint-900 sm:px-8 sm:py-12">
      <Link className="mb-7 inline-flex text-sm text-mint-600 transition-colors hover:text-mint-800" to="/dashboard">
        ← Surveys
      </Link>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-700">Survey analysis</p>
          <h1 className="mb-0 text-3xl font-semibold tracking-tight text-mint-900 sm:text-4xl">{analytics.survey.title}</h1>
        </div>
        <Link
          className="inline-flex min-h-10 items-center rounded-xl border border-mint-200 px-4 text-sm font-semibold text-mint-800 no-underline transition-colors hover:bg-mint-50"
          to={`/surveys/${id}/edit`}
        >
          Edit survey
        </Link>
      </div>

      <section className="mb-7 flex flex-wrap items-center gap-4 rounded-2xl border border-mint-200 bg-mint-50 p-5 sm:px-6">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-200 text-lg text-mint-800" aria-hidden="true">↗</span>
        <div className="flex items-baseline gap-2">
          <strong className="text-2xl font-bold text-mint-800">{analytics.totalResponses}</strong>
          <span className="text-sm text-mint-700">total responses</span>
        </div>
        <Link
          className="ml-auto text-sm font-semibold text-mint-700 no-underline hover:text-mint-900"
          to={`/s/${encodeURIComponent(analytics.survey.slug)}`}
          target="_blank"
          rel="noreferrer"
        >
          Open public survey
        </Link>
      </section>

      {analytics.totalResponses === 0 && (
        <p className="mb-6 rounded-xl border border-mint-100 bg-mint-50 px-4 py-3 text-sm text-mint-700">
          No responses yet. Share your survey to get started.
        </p>
      )}

      <section className="grid gap-4">
        {analytics.questions.map((question) => (
          <QuestionResults key={question.questionId} surveyId={id} question={question} />
        ))}
      </section>
    </main>
  );
}