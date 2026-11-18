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
    return <main className="public-page"><p className="public-state">Loading survey...</p></main>;
  }

  if (loadError && !survey) {
    return (
      <main className="public-page">
        <section className="public-card public-state" role="alert">
          <h1>Survey unavailable</h1>
          <p>{loadError}</p>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="public-page">
        <section className="public-card public-state">
          <h1>Thank you!</h1>
          <p>Your response has been submitted.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-page">
      <form className="public-card" onSubmit={submit}>
        <header className="public-header">
          <p className="public-eyebrow">TakeSurvey</p>
          <h1>{survey.title}</h1>
          {survey.description && <p className="public-description">{survey.description}</p>}
        </header>

        <div className="public-questions">
          {visibleQuestions.map((question) => (
            <fieldset className="public-question" key={question.questionId}>
              <legend>
                {question.label}
                {question.required && <span className="public-required"> *</span>}
              </legend>

              {question.type === 'text' && (
                <textarea
                  id={question.questionId}
                  rows="4"
                  value={answers[question.questionId] || ''}
                  onChange={(event) => setAnswer(question.questionId, event.target.value)}
                />
              )}

              {question.type === 'single_choice' && question.options.map((option) => (
                <label className="public-option" key={option.optionId}>
                  <input
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
                <label className="public-option" key={option.optionId}>
                  <input
                    type="checkbox"
                    checked={(answers[question.questionId] || []).includes(option.optionId)}
                    onChange={() => toggleOption(question.questionId, option.optionId)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}

              {question.type === 'rating' && (
                <div className="public-rating" role="radiogroup" aria-label={question.label}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <label className="public-option" key={rating}>
                      <input
                        type="radio"
                        name={question.questionId}
                        value={rating}
                        checked={answers[question.questionId] === rating}
                        onChange={() => setAnswer(question.questionId, rating)}
                      />
                      <span>{rating}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
        </div>

        {submitError && <p className="public-error" role="alert">{submitError}</p>}
        <button className="public-submit" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit response'}
        </button>
      </form>
    </main>
  );
}