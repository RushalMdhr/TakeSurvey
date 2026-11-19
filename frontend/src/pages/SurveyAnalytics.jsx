import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';

const questionTypeLabels = {
  single_choice: 'Single choice',
  multi_choice: 'Multiple choice',
  rating: 'Rating',
  text: 'Text response'
};

const summaryIcons = {
  responses: (
    <>
      <path d="M7 8h10M7 12h6" />
      <path d="M5 19l-1 2 4-1h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 1 2Z" />
    </>
  ),
  questions: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  )
};

function SummaryCard({ icon, label, value, detail }) {
  return (
    <article className="flex min-h-32 items-start gap-4 rounded-2xl border border-mint-100 bg-white p-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-50 text-mint-700">
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
          viewBox="0 0 24 24"
        >
          {summaryIcons[icon]}
        </svg>
      </span>
      <div className="min-w-0">
        <p className="mb-2 text-sm text-[#71847b]">{label}</p>
        <p className="mb-1 text-2xl font-semibold tracking-tight text-mint-900">{value}</p>
        <p className="mb-0 text-xs text-[#71847b]">{detail}</p>
      </div>
    </article>
  );
}

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
        <p className="text-sm text-[#71847b]" aria-live="polite">Loading answers...</p>
      ) : result.answers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mint-200 bg-mint-50/40 px-4 py-6 text-center">
          <p className="mb-0 text-sm text-[#71847b]">No text responses yet</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {result.answers.map((answer) => (
              <article className="rounded-xl border border-mint-100 bg-mint-50/40 p-4 sm:p-5" key={answer.responseId}>
                <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-6 text-mint-900">{answer.text}</p>
                {answer.submittedAt && !Number.isNaN(new Date(answer.submittedAt).getTime()) && (
                  <time className="text-xs text-[#71847b]" dateTime={answer.submittedAt}>
                    Submitted {new Date(answer.submittedAt).toLocaleDateString()}
                  </time>
                )}
              </article>
            ))}
          </div>
          {result.totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#71847b]">
                {result.totalAnswers} {result.totalAnswers === 1 ? 'response' : 'responses'}
              </span>
              <div className="flex items-center gap-3">
                <button
                  className="rounded-lg border border-mint-200 px-3 py-2 text-xs font-semibold text-mint-800 transition-colors hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                >
                  Previous
                </button>
                <span className="text-xs text-[#71847b]" aria-live="polite">
                  {page} / {result.totalPages}
                </span>
                <button
                  className="rounded-lg border border-mint-200 px-3 py-2 text-xs font-semibold text-mint-800 transition-colors hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))}
                  disabled={page >= result.totalPages || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const chartColors = [
  '#0f7668',
  '#0d9480',
  '#14b89c',
  '#2dd4b3',
  '#5ceacc',
  '#99f6df',
  '#135e53',
  '#6ee7c8'
];

function formatPercentage(count, total) {
  return total ? `${Math.round((count / total) * 1000) / 10}%` : '0%';
}

function getPieSlicePath(startAngle, endAngle, radius, center) {
  const toPoint = (angle) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians)
    };
  };
  const start = toPoint(startAngle);
  const end = toPoint(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function PieChart({ distribution, answeredCount }) {
  if (answeredCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-mint-200 bg-mint-50/40 px-4 py-6 text-center">
        <p className="mb-0 text-sm text-[#71847b]">No answers to display yet</p>
      </div>
    );
  }

  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  const slices = distribution
    .map((item, index) => {
      const countBefore = distribution
        .slice(0, index)
        .reduce((sum, previous) => sum + previous.count, 0);
      const startAngle = total ? -90 + (countBefore / total) * 360 : -90;
      const endAngle = total ? startAngle + (item.count / total) * 360 : startAngle;
      return { ...item, index, startAngle, endAngle };
    })
    .filter((item) => item.count > 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <svg
        className="h-44 w-44 shrink-0"
        role="img"
        aria-label="Pie chart showing the proportion of responses for each option"
        viewBox="0 0 200 200"
      >
        <title>Response proportion by option</title>
        {total === 0 ? (
          <circle cx="100" cy="100" r="82" fill="#f0fdf9" />
        ) : slices.length === 1 ? (
          <circle cx="100" cy="100" r="82" fill={chartColors[slices[0].index % chartColors.length]} />
        ) : (
          slices.map((item) => (
            <path
              d={getPieSlicePath(item.startAngle, item.endAngle, 82, 100)}
              fill={chartColors[item.index % chartColors.length]}
              key={item.optionId}
              stroke="white"
              strokeWidth="2"
            />
          ))
        )}
      </svg>
      <ul className="m-0 grid w-full min-w-0 list-none gap-2 p-0" aria-label="Option counts and percentages">
        {distribution.map((item, index) => (
          <li className="flex min-w-0 items-center justify-between gap-3 text-sm" key={item.optionId}>
            <span className="flex min-w-0 items-center gap-2 text-mint-800">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: chartColors[index % chartColors.length] }}
                aria-hidden="true"
              />
              <span className="break-words">{item.label}</span>
            </span>
            <span className="shrink-0 text-right text-xs text-[#71847b]">
              {item.count} · {formatPercentage(item.count, answeredCount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SingleChoiceBarChart({ distribution, answeredCount }) {
  if (answeredCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-mint-200 bg-mint-50/40 px-4 py-6 text-center">
        <p className="mb-0 text-sm text-[#71847b]">No answers to display yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4" role="list">
      {distribution.map((item) => {
        const percentage = answeredCount ? (item.count / answeredCount) * 100 : 0;
        const detail = `${item.count} ${item.count === 1 ? 'response' : 'responses'} · ${formatPercentage(item.count, answeredCount)}`;

        return (
          <div className="grid gap-2" key={item.optionId} role="listitem">
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
              <span className="min-w-0 break-words text-mint-800">{item.label}</span>
              <span className="shrink-0 text-right text-xs font-medium text-[#71847b]">{detail}</span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-mint-100"
              role="img"
              aria-label={`${item.label}: ${detail}`}
              title={`${item.label}: ${detail}`}
            >
              <span
                className="block h-full rounded-full bg-mint-500 transition-[width] duration-300"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SingleChoiceAnalytics({ question }) {
  const [chartType, setChartType] = useState('pie');

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <div
          className="inline-flex rounded-lg bg-mint-50 p-1"
          role="group"
          aria-label={`Chart type for ${question.label}`}
        >
          {['pie', 'bar'].map((type) => (
            <button
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                chartType === type
                  ? 'bg-white text-mint-800'
                  : 'text-[#71847b] hover:text-mint-800'
              }`}
              type="button"
              aria-pressed={chartType === type}
              onClick={() => setChartType(type)}
              key={type}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="analytics-chart-enter" key={chartType}>
        {chartType === 'pie' ? (
          <PieChart distribution={question.distribution} answeredCount={question.answeredCount} />
        ) : (
          <SingleChoiceBarChart distribution={question.distribution} answeredCount={question.answeredCount} />
        )}
      </div>
    </div>
  );
}

function MultipleChoiceChart({ distribution, answeredCount }) {
  if (answeredCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-mint-200 bg-mint-50/40 px-4 py-8 text-center">
        <p className="mb-0 text-sm text-[#71847b]">No answers to display yet</p>
      </div>
    );
  }

  const highestCount = Math.max(...distribution.map((item) => item.count), 1);

  return (
    <div className="grid gap-6 py-1" role="list">
      {distribution.map((item, index) => (
        <div className="grid gap-2.5" key={item.optionId} role="listitem">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="min-w-0 break-words text-sm font-medium text-mint-800">{item.label}</span>
            <span className="shrink-0 text-right text-xs text-[#71847b]">
              <strong className="text-sm font-semibold text-mint-900">{item.count}</strong>
              {' '}{item.count === 1 ? 'selection' : 'selections'} · {formatPercentage(item.count, answeredCount)} of respondents
            </span>
          </div>
          <div
            className="h-5 overflow-hidden rounded-md bg-mint-50"
            role="img"
            aria-label={`${item.label}: selected by ${item.count} respondents, ${formatPercentage(item.count, answeredCount)} of respondents`}
            title={`${item.label}: ${item.count} selections · ${formatPercentage(item.count, answeredCount)} of respondents`}
          >
            <span
              className="block h-full min-w-0 rounded-md transition-[width] duration-300"
              style={{
                width: `${(item.count / highestCount) * 100}%`,
                backgroundColor: chartColors[index % chartColors.length]
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function getQuestionAverage(question) {
  if (question.answeredCount === 0) return null;
  const total = question.distribution.reduce((sum, item) => sum + item.value * item.count, 0);
  return Number((total / question.answeredCount).toFixed(2));
}

function RatingDistributionChart({ distribution }) {
  const width = 640;
  const height = 330;
  const left = 54;
  const right = 22;
  const top = 30;
  const bottom = 244;
  const plotWidth = width - left - right;
  const plotHeight = bottom - top;
  const highestCount = Math.max(...distribution.map((item) => item.count), 1);
  const ticks = [...new Set([0, Math.ceil(highestCount / 2), highestCount])].sort((a, b) => a - b);
  const barWidth = Math.min(54, plotWidth / 10);

  return (
    <div className="w-full min-w-0">
      <svg
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Rating distribution chart. Horizontal axis shows rating from 1 to 5 stars; vertical axis shows number of responses."
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>Rating distribution</title>
        <desc>Counts of responses for each rating from 1 to 5 stars.</desc>
        {ticks.map((tick) => {
          const y = bottom - (tick / highestCount) * plotHeight;
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e6f4ef" strokeWidth="1" />
              <text x={left - 10} y={y + 4} textAnchor="end" fill="#71847b" fontSize="12">
                {tick}
              </text>
            </g>
          );
        })}
        <line x1={left} x2={width - right} y1={bottom} y2={bottom} stroke="#cce9df" strokeWidth="1.5" />
        <text
          x="16"
          y={top + plotHeight / 2}
          textAnchor="middle"
          fill="#71847b"
          fontSize="12"
          transform={`rotate(-90 16 ${top + plotHeight / 2})`}
        >
          Number of responses
        </text>
        {distribution.map((item, index) => {
          const center = left + plotWidth * ((index + 0.5) / distribution.length);
          const barHeight = (item.count / highestCount) * plotHeight;
          const y = bottom - barHeight;

          return (
            <g key={item.value}>
              <rect
                x={center - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="6"
                fill={chartColors[index % chartColors.length]}
              />
              <text
                x={center}
                y={Math.max(top + 16, y - 9)}
                textAnchor="middle"
                fill="#154e45"
                fontSize="13"
                fontWeight="600"
              >
                {item.count}
              </text>
              <text x={center} y={bottom + 24} textAnchor="middle" fill="#526b61" fontSize="12">
                {item.value} ★
              </text>
            </g>
          );
        })}
        <text x={left + plotWidth / 2} y={height - 16} textAnchor="middle" fill="#71847b" fontSize="12">
          Rating (stars)
        </text>
      </svg>
    </div>
  );
}

function QuestionHeader({ question }) {
  const progress = question.shownCount
    ? Math.round((question.answeredCount / question.shownCount) * 100)
    : 0;

  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <span className="mb-2 inline-flex rounded-full bg-mint-50 px-2.5 py-1 text-[11px] font-semibold text-mint-700">
          {questionTypeLabels[question.type] || question.type.replaceAll('_', ' ')}
        </span>
        <h3 className="mb-0 break-words text-base font-semibold leading-6 text-mint-900">{question.label}</h3>
      </div>
      <div className="shrink-0 text-right">
        <strong className="block text-sm font-semibold text-mint-800">
          {question.answeredCount}<span className="font-normal text-[#71847b]"> / {question.shownCount}</span>
        </strong>
        <small className="text-xs text-[#71847b]">answered · {progress}%</small>
      </div>
    </header>
  );
}

function QuestionResults({ question }) {
  const average = question.type === 'rating' ? getQuestionAverage(question) : null;

  return (
    <article className="rounded-2xl border border-mint-100 bg-white p-5 sm:p-6">
      <QuestionHeader question={question} />
      {question.type === 'rating' ? (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-xl bg-mint-50/60 p-4">
            <div>
              <p className="mb-1 text-xs font-medium text-[#71847b]">Average rating</p>
              <p className="mb-0 flex items-baseline gap-2">
                <strong className="text-3xl font-semibold tracking-tight text-mint-800">
                  {average ?? '—'}
                </strong>
                <span className="text-sm text-[#71847b]">/ 5</span>
              </p>
            </div>
            <div className="text-right">
              <strong className="block text-lg font-semibold text-mint-900">{question.answeredCount}</strong>
              <span className="text-xs text-[#71847b]">
                {question.answeredCount === 1 ? 'response' : 'responses'}
              </span>
            </div>
          </div>
          <RatingDistributionChart distribution={question.distribution} />
        </>
      ) : question.type === 'multi_choice' ? (
        <>
          <p className="mb-5 rounded-lg bg-mint-50/70 px-3 py-2 text-xs leading-5 text-mint-700">
            Respondents could select multiple options. Percentages use respondents who answered this question, so they may add up to more than 100%.
          </p>
          <MultipleChoiceChart
            distribution={question.distribution}
            answeredCount={question.answeredCount}
          />
        </>
      ) : (
        <SingleChoiceAnalytics question={question} />
      )}
      <footer className="mt-5 border-t border-mint-100 pt-4 text-xs text-[#71847b]">
        {question.unansweredCount} unanswered
      </footer>
    </article>
  );
}

function TextQuestionResults({ surveyId, question }) {
  return (
    <article className="rounded-2xl border border-mint-100 bg-white p-5 sm:p-6">
      <QuestionHeader question={question} />
      <TextAnswers surveyId={surveyId} question={question} />
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
      <main className="mx-auto max-w-7xl px-5 py-12 font-sans text-mint-900 sm:px-8" aria-busy="true">
        <div className="mb-8 h-4 w-24 animate-pulse rounded bg-mint-100" />
        <div className="mb-8 h-10 max-w-md animate-pulse rounded-lg bg-mint-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div className="h-32 animate-pulse rounded-2xl border border-mint-100 bg-white" key={item} />
          ))}
        </div>
        <p className="sr-only" role="status">Loading analysis...</p>
      </main>
    );
  }

  if (error || !analytics) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-12 font-sans text-mint-900 sm:px-8">
        <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600" role="alert">
          {error || 'Analysis unavailable.'}
        </p>
        <Link className="text-sm font-semibold text-mint-700 hover:text-mint-900" to="/dashboard">
          Back to surveys
        </Link>
      </main>
    );
  }

  const choiceQuestions = analytics.questions.filter((question) => question.type !== 'text');
  const textQuestions = analytics.questions.filter((question) => question.type === 'text');

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 font-sans text-mint-900 sm:px-8 sm:py-10">
      <Link className="mb-7 inline-flex text-sm font-medium text-mint-600 transition-colors hover:text-mint-800" to="/dashboard">
        ← Surveys
      </Link>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-700">Survey analytics</p>
          <h1 className="mb-2 break-words text-3xl font-semibold tracking-tight text-mint-900 sm:text-4xl">
            {analytics.survey.title}
          </h1>
          <p className="mb-0 text-sm text-[#71847b]">
            {analytics.totalResponses} {analytics.totalResponses === 1 ? 'response' : 'responses'} collected
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-mint-200 px-4 text-sm font-semibold text-mint-800 no-underline transition-colors hover:bg-mint-50 sm:flex-none"
            to={`/s/${encodeURIComponent(analytics.survey.slug)}`}
            target="_blank"
            rel="noreferrer"
          >
            View survey <span className="ml-2" aria-hidden="true">↗</span>
          </Link>
          <Link
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-mint-700 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-mint-800 sm:flex-none"
            to={`/surveys/${id}/edit`}
          >
            Edit survey
          </Link>
        </div>
      </header>

      <section className="mb-10 grid gap-3 sm:grid-cols-2" aria-label="Summary statistics">
        <SummaryCard
          icon="responses"
          label="Total responses"
          value={analytics.totalResponses}
          detail="Completed submissions"
        />
        <SummaryCard
          icon="questions"
          label="Questions"
          value={analytics.questions.length}
          detail="In this survey"
        />
      </section>

      {analytics.totalResponses === 0 && (
        <p className="mb-8 rounded-xl border border-mint-100 bg-mint-50 px-4 py-3 text-sm text-mint-700">
          No responses yet. Share your survey to get started.
        </p>
      )}

      <section className="mb-10" aria-labelledby="question-analytics-heading">
        <div className="mb-5">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-700">Results</p>
          <h2 className="mb-1 text-xl font-semibold tracking-tight text-mint-900" id="question-analytics-heading">
            Question breakdown
          </h2>
          <p className="mb-0 text-sm text-[#71847b]">See how respondents answered each question.</p>
        </div>
        {choiceQuestions.length > 0 ? (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {choiceQuestions.map((question) => (
              <QuestionResults key={question.questionId} question={question} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-mint-200 bg-white px-5 py-8 text-center text-sm text-[#71847b]">
            No choice or rating questions in this survey.
          </p>
        )}
      </section>

      {textQuestions.length > 0 && (
        <section aria-labelledby="text-responses-heading">
          <div className="mb-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-700">Written feedback</p>
            <h2 className="mb-1 text-xl font-semibold tracking-tight text-mint-900" id="text-responses-heading">
              Text responses
            </h2>
            <p className="mb-0 text-sm text-[#71847b]">Open-ended answers, grouped by question.</p>
          </div>
          <div className="grid items-start gap-4">
            {textQuestions.map((question) => (
              <TextQuestionResults key={question.questionId} surveyId={id} question={question} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
