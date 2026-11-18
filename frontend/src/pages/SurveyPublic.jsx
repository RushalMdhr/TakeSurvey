import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';

function isQuestionVisible(question, answers, questionById) {
  const condition = question.dependsOn;
  if (!condition?.questionId && !condition?.optionId) {
    return true;
  }

  const parent = questionById.get(condition.questionId);
  const value = answers[condition.questionId];
  if (!parent || value === undefined) {
    return false;
  }

  return parent.type === 'multi_choice'
    ? Array.isArray(value) && value.includes(condition.optionId)
    : value === condition.optionId;
}

function hasValue(question, value) {
  if (question.type === 'text') {
    return typeof value === 'string' && value.trim().length > 0;
  }
  if (question.type === 'multi_choice') {
    return Array.isArray(value) && value.length > 0;
  }
  return value !== undefined && value !== null && value !== '';
}

export default function SurveyPublic() {
  const { slug } = useParams();
  const [surveyState, setSurveyState] = useState({
    slug: null,
    survey: null,
    error: '',
    loading: true
  });
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    api.get(`/public/surveys/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (active) {
          setSurveyState({ slug, survey: data.survey, error: '', loading: false });
          setAnswers({});
          setSubmitted(false);
          setSubmitError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setSurveyState({
            slug,
            survey: null,
            error: requestError.response?.data?.message || 'Unable to load this survey.',
            loading: false
          });
        }
      })

    return () => {
      active = false;
    };
  }, [slug]);

  const loading = surveyState.slug !== slug || surveyState.loading;
  const survey = surveyState.slug === slug ? surveyState.survey : null;
  const loadError = surveyState.slug === slug ? surveyState.error : '';
  const questionById = new Map((survey?.questions || []).map((question) => [
    question.questionId,
    question
  ]));
  const visibleQuestions = (survey?.questions || []).filter(
    (question) => isQuestionVisible(question, answers, questionById)
  );

  function setAnswer(questionId, value) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function toggleOption(questionId, optionId) {
    const current = answers[questionId] || [];
    setAnswer(
      questionId,
      current.includes(optionId)
        ? current.filter((value) => value !== optionId)
        : [...current, optionId]
    );
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitError('');

    const missing = visibleQuestions.find(
      (question) => question.required && !hasValue(question, answers[question.questionId])
    );
    if (missing) {
      setSubmitError(`Please answer: ${missing.label}`);
      return;
    }

    const responseAnswers = visibleQuestions
      .filter((question) => hasValue(question, answers[question.questionId]))
      .map((question) => ({
        questionId: question.questionId,
        value: answers[question.questionId]
      }));

    setSubmitting(true);
    try {
      await api.post(`/public/surveys/${encodeURIComponent(slug)}/responses`, {
        answers: responseAnswers
      });
      setSubmitted(true);
    } catch (requestError) {
      setSubmitError(requestError.response?.data?.message || 'Unable to submit your response.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-mint-50 px-5 py-10 font-sans text-mint-900">
        <p className="text-sm text-mint-600">Loading survey...</p>
      </main>
    );
  }

  if (loadError && !survey) {
    return (
      <main className="grid min-h-screen place-items-center bg-mint-50 px-5 py-10 font-sans text-mint-900">
        <section className="w-full max-w-xl rounded-2xl border border-mint-100 bg-white p-7 text-center shadow-[0_16px_42px_rgba(29,86,62,0.08)] sm:p-10" role="alert">
          <h1 className="mb-3 text-2xl font-bold text-mint-900">Survey unavailable</h1>
          <p className="mb-0 text-sm text-[#71847b]">{loadError}</p>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="grid min-h-screen place-items-center bg-mint-50 px-5 py-10 font-sans text-mint-900">
        <section className="w-full max-w-xl rounded-2xl border border-mint-100 bg-white p-7 text-center shadow-[0_16px_42px_rgba(29,86,62,0.08)] sm:p-10">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-mint-100 text-xl text-mint-700" aria-hidden="true">✓</span>
          <h1 className="mb-3 text-2xl font-bold text-mint-900">Thank you!</h1>
          <p className="mb-0 text-sm text-[#71847b]">Your response has been submitted.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mint-50 px-4 py-8 font-sans text-mint-900 sm:px-6 sm:py-12">
      <form
        className="mx-auto w-full max-w-2xl rounded-2xl border border-mint-100 bg-white p-5 shadow-[0_16px_42px_rgba(29,86,62,0.08)] sm:p-9"
        onSubmit={submit}
      >
        <header className="mb-8 border-b border-mint-100 pb-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-mint-600">TakeSurvey</p>
          <h1 className="mb-2 break-words text-2xl font-bold text-mint-900 sm:text-3xl">{survey.title}</h1>
          {survey.description && (
            <p className="mb-0 whitespace-pre-wrap text-sm leading-6 text-mint-600">{survey.description}</p>
          )}
        </header>

        <div className="grid gap-5">
          {visibleQuestions.map((question) => (
            <fieldset className="min-w-0 rounded-xl border border-mint-100 bg-mint-50/50 p-5" key={question.questionId}>
              <legend className="max-w-full px-1 text-sm font-semibold text-mint-800">
                {question.label}
                {question.required && <span className="text-red-400"> *</span>}
              </legend>

              {question.type === 'text' && (
                <textarea
                  className="mt-2 w-full resize-y rounded-lg border border-mint-200 bg-white px-4 py-3 text-sm text-mint-900 outline-none placeholder:text-mint-300 focus:border-mint-400 focus:ring-2 focus:ring-mint-300/40"
                  id={question.questionId}
                  rows="4"
                  value={answers[question.questionId] || ''}
                  onChange={(event) => setAnswer(question.questionId, event.target.value)}
                />
              )}

              {question.type === 'single_choice' && question.options.map((option) => (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-mint-700 transition-colors hover:bg-mint-50" key={option.optionId}>
                  <input
                    className="h-4 w-4 accent-mint-500"
                    type="radio"
                    name={question.questionId}
                    value={option.optionId}
                    checked={answers[question.questionId] === option.optionId}
                    onChange={() => setAnswer(question.questionId, option.optionId)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}

              {question.type === 'multi_choice' && question.options.map((option) => (
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-mint-700 transition-colors hover:bg-mint-50" key={option.optionId}>
                  <input
                    className="h-4 w-4 accent-mint-500"
                    type="checkbox"
                    checked={(answers[question.questionId] || []).includes(option.optionId)}
                    onChange={() => toggleOption(question.questionId, option.optionId)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}

              {question.type === 'rating' && (
                <div className="mt-2 flex flex-wrap gap-3" role="radiogroup" aria-label={question.label}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label className="grid cursor-pointer place-items-center gap-1 text-xs text-mint-700" key={rating}>
                      <input
                        className="sr-only peer"
                        type="radio"
                        name={question.questionId}
                        value={rating}
                        checked={answers[question.questionId] === rating}
                        onChange={() => setAnswer(question.questionId, rating)}
                      />
                      <span className="grid h-10 w-10 place-items-center rounded-lg border border-mint-200 bg-white text-sm text-mint-500 transition-colors peer-checked:border-mint-500 peer-checked:bg-mint-500 peer-checked:text-white">
                        {rating}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
        </div>

        {submitError && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}
        <button
          className="mt-7 min-h-11 w-full rounded-xl bg-mint-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-mint-200 transition-colors hover:bg-mint-600 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit response'}
        </button>
      </form>
    </main>
  );
}