import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client.js';
import QuestionEditor from '../components/QuestionEditor.jsx';
import QuestionRenderer from '../components/QuestionRenderer.jsx';

const questionTypeLabels = {
  text: 'Text',
  single_choice: 'Single Select',
  multi_choice: 'Multi Select',
  rating: 'Rating'
};

export default function SurveyBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingDetails, setEditingDetails] = useState(!id);
  const [activeView, setActiveView] = useState({ id, view: 'build' });
  const [draggingQuestionId, setDraggingQuestionId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loadState, setLoadState] = useState({ id: null, loading: false, error: '' });

  useEffect(() => {
    if (!id) return undefined;
    let active = true;

    api.get(`/surveys/${id}`)
      .then(({ data }) => {
        if (!active) return;
        const loadedSurvey = data.survey;
        setSurvey(loadedSurvey);
        setQuestions([...loadedSurvey.questions].sort((a, b) => a.position - b.position));
        setTitle(loadedSurvey.title);
        setDescription(loadedSurvey.description || '');
        setEditingDetails(false);
        setLoadState({ id, loading: false, error: '' });
      })
      .catch((requestError) => {
        if (active) {
          setLoadState({
            id,
            loading: false,
            error: requestError.response?.data?.message || 'Could not load survey.'
          });
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const loading = Boolean(id) && (loadState.id !== id || loadState.loading);
  const loadError = loadState.id === id ? loadState.error : '';
  const published = survey?.status === 'published';
  const closed = survey?.status === 'closed';
  const editable = survey?.status === 'draft';
  const currentView = activeView.id === id ? activeView.view : 'build';
  const activeQuestion = useMemo(
    () => editingQuestionId && editingQuestionId !== 'new'
      ? questions.find((question) => question.questionId === editingQuestionId)
      : null,
    [editingQuestionId, questions]
  );

  async function saveSurvey(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingSurvey(true);
    try {
      const payload = { title: title.trim(), description: description.trim() };
      if (!payload.title) {
        setError('Add a survey title.');
        return;
      }

      if (!id) {
        const { data } = await api.post('/surveys', payload);
        navigate(`/surveys/${data.survey._id}/edit`, { replace: true });
        return;
      }

      const { data } = await api.patch(`/surveys/${id}`, payload);
      setSurvey(data.survey);
      setEditingDetails(false);
      setNotice('Saved');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save survey.');
    } finally {
      setSavingSurvey(false);
    }
  }

  async function saveQuestion(payload) {
    setError('');
    if (editingQuestionId === 'new') {
      const { data } = await api.post(`/surveys/${id}/questions`, payload);
      setQuestions((current) => [...current, data.question].sort((a, b) => a.position - b.position));
    } else {
      const { data } = await api.patch(
        `/surveys/${id}/questions/${encodeURIComponent(editingQuestionId)}`,
        payload
      );
      setQuestions((current) => current.map((question) => (
        question.questionId === data.question.questionId ? data.question : question
      )).sort((a, b) => a.position - b.position));
    }
    setEditingQuestionId(null);
  }

  async function deleteQuestion(question) {
    if (!window.confirm(`Delete "${question.label}"?`)) return;
    setError('');
    try {
      await api.delete(`/surveys/${id}/questions/${encodeURIComponent(question.questionId)}`);
      setQuestions((current) => current
        .filter((item) => item.questionId !== question.questionId)
        .map((item, position) => ({ ...item, position })));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not delete question.');
    }
  }

  async function reorderQuestion(sourceQuestionId, targetQuestionId, position) {
    const sourceIndex = questions.findIndex((question) => question.questionId === sourceQuestionId);
    const targetIndex = questions.findIndex((question) => question.questionId === targetQuestionId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const reordered = [...questions];
    const [movedQuestion] = reordered.splice(sourceIndex, 1);
    let insertionIndex = targetIndex + (position === 'after' ? 1 : 0);
    if (sourceIndex < targetIndex) insertionIndex -= 1;
    reordered.splice(insertionIndex, 0, movedQuestion);
    if (reordered.every((question, index) => question.questionId === questions[index].questionId)) return;

    try {
      const { data } = await api.patch(`/surveys/${id}/questions/reorder`, {
        questionIds: reordered.map((question) => question.questionId)
      });
      setQuestions(data.questions);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reorder questions.');
    }
  }

  function startQuestionDrag(event, questionId) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', questionId);
    setDraggingQuestionId(questionId);
    setDropTarget(null);
  }

  function updateDropTarget(event, questionId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    setDropTarget((current) => (
      current?.questionId === questionId && current.position === position
        ? current
        : { questionId, position }
    ));
  }

  async function dropQuestion(event, targetQuestionId) {
    event.preventDefault();
    const sourceQuestionId = event.dataTransfer.getData('text/plain') || draggingQuestionId;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    setDraggingQuestionId(null);
    setDropTarget(null);
    await reorderQuestion(sourceQuestionId, targetQuestionId, position);
  }

  async function publish() {
    setError('');
    setNotice('');
    try {
      const { data } = await api.post(`/surveys/${id}/publish`);
      setSurvey({ ...data.survey, hasResponses: false });
      setPublicUrl(data.publicUrl);
      setNotice('Your survey is live');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not publish survey.');
    }
  }

  async function unpublish() {
    setError('');
    setNotice('');
    setUnpublishing(true);
    try {
      const { data } = await api.post(`/surveys/${id}/unpublish`);
      setSurvey({ ...data.survey, hasResponses: false });
      setPublicUrl('');
      setNotice('Survey unpublished');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not unpublish survey.');
    } finally {
      setUnpublishing(false);
    }
  }

  async function closeSurvey() {
    if (!window.confirm('Close this survey? It will stop accepting new responses.')) return;
    setError('');
    setNotice('');
    setClosing(true);
    try {
      const { data } = await api.post(`/surveys/${id}/close`);
      setSurvey({ ...data.survey, hasResponses: true });
      setNotice('Survey closed. No new responses will be accepted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not close survey.');
    } finally {
      setClosing(false);
    }
  }

  function cancelDetailsEdit() {
    setTitle(survey.title);
    setDescription(survey.description || '');
    setEditingDetails(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 font-sans text-mint-900">
        <p className="mx-auto max-w-3xl py-10 text-center text-mint-600">Loading...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 font-sans text-mint-900">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600" role="alert">
            {loadError}
          </p>
          <Link className="text-sm font-medium text-mint-600 hover:text-mint-800" to="/dashboard">
            Back to surveys
          </Link>
        </div>
      </main>
    );
  }

  const questionForEditor = activeQuestion || null;

  return (
    <main className="min-h-screen bg-white px-5 py-8 font-sans text-mint-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link className="mb-7 inline-flex text-sm text-mint-600 transition-colors hover:text-mint-800" to="/dashboard">
          ← Surveys
        </Link>

        <header className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.13em] text-mint-600">
              {id ? (closed ? 'Closed survey' : published ? 'Published survey' : 'Draft survey') : 'New survey'}
            </p>
            <div className="flex items-start gap-2">
              <h1 className="mb-0 break-words text-3xl font-bold tracking-tight text-mint-900 sm:text-4xl">
                {id ? survey.title : 'Start a survey'}
              </h1>
              {id && !closed && !editingDetails && (
                <button
                  className="mt-1 rounded-lg p-2 text-mint-400 transition-colors hover:bg-mint-50 hover:text-mint-700"
                  type="button"
                  onClick={() => setEditingDetails(true)}
                  aria-label="Edit survey title and description"
                  title="Edit survey details"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
                    <path d="m13.8 3.2 3 3M4 16l3.8-.8L17 6a2.1 2.1 0 0 0-3-3L4.8 13.2 4 16Z" />
                  </svg>
                </button>
              )}
            </div>
            {id && survey.description && (
              <p className="mb-0 mt-2 whitespace-pre-wrap text-base text-mint-600">
                {survey.description}
              </p>
            )}
          </div>

          {id && (
            <div className="flex flex-wrap gap-2">
              {published ? (
                <>
                  <a
                    className="rounded-xl bg-mint-500 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-mint-200 transition-colors hover:bg-mint-600"
                    href={`/s/${encodeURIComponent(survey.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open survey ↗
                  </a>
                  {survey.hasResponses ? (
                    <button
                      className="rounded-xl border border-orange-200 bg-white px-5 py-3 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={closeSurvey}
                      disabled={closing}
                    >
                      {closing ? 'Closing...' : 'Close survey'}
                    </button>
                  ) : (
                    <button
                      className="rounded-xl border border-mint-200 bg-white px-5 py-3 text-sm font-medium text-mint-700 transition-colors hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      onClick={unpublish}
                      disabled={unpublishing}
                    >
                      {unpublishing ? 'Unpublishing...' : 'Unpublish'}
                    </button>
                  )}
                  {survey.hasResponses && (
                    <Link
                      className="rounded-xl border border-mint-200 bg-white px-5 py-3 text-sm font-medium text-mint-700 no-underline transition-colors hover:bg-mint-50"
                      to={`/surveys/${id}/analytics`}
                    >
                      Analytics
                    </Link>
                  )}
                </>
              ) : closed ? (
                <>
                  {survey.hasResponses && (
                    <Link
                      className="rounded-xl border border-mint-200 bg-white px-5 py-3 text-sm font-medium text-mint-700 no-underline transition-colors hover:bg-mint-50"
                      to={`/surveys/${id}/analytics`}
                    >
                      Analytics
                    </Link>
                  )}
                  <span className="inline-flex items-center rounded-xl bg-orange-50 px-5 py-3 text-sm font-medium text-orange-800">
                    Closed
                  </span>
                </>
              ) : (
                <button
                  className="rounded-xl bg-mint-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-mint-200 transition-colors hover:bg-mint-600 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  onClick={publish}
                  disabled={questions.length === 0}
                >
                  Publish
                </button>
              )}
            </div>
          )}
        </header>

        {error && (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-5 rounded-xl border border-mint-200 bg-mint-50 p-4 text-sm text-mint-700" role="status">
            {notice}
          </p>
        )}
        {published && (
          <div className="mb-7 flex items-center gap-3 rounded-xl border border-mint-100 bg-mint-50 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint-100 text-mint-700" aria-hidden="true">
              ↗
            </span>
            <div className="min-w-0">
              <strong className="block text-sm font-semibold text-mint-800">Share your survey</strong>
              <a
                className="block break-all text-xs text-mint-600 hover:text-mint-800"
                href={publicUrl || `/s/${encodeURIComponent(survey.slug)}`}
                target="_blank"
                rel="noreferrer"
              >
                {publicUrl || `${window.location.origin}/s/${survey.slug}`}
              </a>
            </div>
          </div>
        )}

        {id && (
          <nav className="sticky top-0 z-10 mb-8 flex justify-center border-b border-mint-100 bg-white/90 py-3 backdrop-blur-sm" aria-label="Survey views">
            <div className="flex gap-1 rounded-full bg-mint-50 p-1">
              <button
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  currentView === 'build'
                    ? 'border-b-2 border-mint-500 bg-white text-mint-700 shadow-sm'
                    : 'text-mint-600 hover:text-mint-700'
                }`}
                type="button"
                aria-pressed={currentView === 'build'}
                onClick={() => setActiveView({ id, view: 'build' })}
              >
                Build
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  currentView === 'preview'
                    ? 'border-b-2 border-mint-500 bg-white text-mint-700 shadow-sm'
                    : 'text-mint-600 hover:text-mint-700'
                }`}
                type="button"
                aria-pressed={currentView === 'preview'}
                onClick={() => setActiveView({ id, view: 'preview' })}
                disabled={editingDetails || Boolean(editingQuestionId)}
              >
                Preview
              </button>
            </div>
          </nav>
        )}

        {currentView === 'preview' && id ? (
          <section className="mx-auto max-w-2xl px-1 pb-10 sm:px-0">
            <header className="mb-8 text-center">
              <h2 className="mb-0 text-2xl font-bold text-mint-900">{title || 'Untitled Survey'}</h2>
              {description && <p className="mb-0 mt-2 whitespace-pre-wrap text-mint-600">{description}</p>}
            </header>
            <QuestionRenderer questions={questions} />
            <button
              className="mt-8 w-full rounded-xl bg-mint-500 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-mint-200 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled
            >
              Submit Response
            </button>
          </section>
        ) : (
          <section className="mx-auto max-w-3xl">
            {(!id || editingDetails) && (
              <form className="mb-10 space-y-4" onSubmit={saveSurvey}>
                <label className="sr-only" htmlFor="survey-title">Survey title</label>
                <input
                  id="survey-title"
                  autoFocus
                  maxLength="120"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Untitled Survey"
                  className="w-full border-0 bg-transparent p-0 text-3xl font-bold text-mint-900 outline-none placeholder:text-mint-300 focus:ring-0 sm:text-4xl"
                />
                <label className="sr-only" htmlFor="survey-description">Survey description</label>
                <textarea
                  id="survey-description"
                  rows="2"
                  maxLength="2000"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add a description..."
                  className="w-full resize-y border-0 bg-transparent p-0 text-base text-mint-600 outline-none placeholder:text-mint-300 focus:ring-0"
                />
                <div className="flex justify-end gap-3">
                  {id && (
                    <button
                      className="rounded-xl border border-mint-200 px-5 py-2.5 text-sm font-medium text-mint-700 transition-colors hover:bg-mint-50"
                      type="button"
                      onClick={cancelDetailsEdit}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="rounded-xl bg-mint-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-mint-200 transition-colors hover:bg-mint-600 disabled:cursor-not-allowed disabled:opacity-50"
                    type="submit"
                    disabled={savingSurvey}
                  >
                    {savingSurvey ? 'Saving...' : id ? 'Save details' : 'Create survey'}
                  </button>
                </div>
              </form>
            )}

            {id && (
              <section className="space-y-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.13em] text-mint-600">Questions</p>
                    <h2 className="mb-0 text-xl font-semibold text-mint-900">{questions.length} total</h2>
                  </div>
                </div>

                {questions.length === 0 && (
                  <p className="rounded-xl border border-mint-100 bg-mint-50 px-5 py-4 text-sm text-mint-700">
                    No questions yet. Add your first question below.
                  </p>
                )}

                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <article
                      className={`relative rounded-xl border border-mint-100 bg-white p-5 transition-all hover:shadow-[0_4px_20px_rgba(20,184,156,0.08)] ${
                        draggingQuestionId === question.questionId ? 'opacity-50' : ''
                      }`}
                      key={question.questionId}
                      onDragOver={(event) => updateDropTarget(event, question.questionId)}
                      onDrop={(event) => dropQuestion(event, question.questionId)}
                    >
                      {dropTarget?.questionId === question.questionId && (
                        <span
                          className={`pointer-events-none absolute inset-x-4 z-10 h-0.5 rounded-full bg-mint-300 opacity-75 ${
                            dropTarget.position === 'before' ? '-top-2' : '-bottom-2'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-mint-50 px-2 py-1 text-xs font-medium text-mint-600">
                            {questionTypeLabels[question.type] || question.type}
                          </span>
                          {question.required && (
                            <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-400">
                              Required
                            </span>
                          )}
                        </div>
                        {editable && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              className="cursor-grab rounded-lg p-1.5 text-mint-400 transition-colors hover:bg-mint-50 hover:text-mint-700 active:cursor-grabbing"
                              type="button"
                              draggable
                              onDragStart={(event) => startQuestionDrag(event, question.questionId)}
                              onDragEnd={() => {
                                setDraggingQuestionId(null);
                                setDropTarget(null);
                              }}
                              aria-label={`Drag to reorder question ${index + 1}`}
                              title="Drag to reorder"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                <circle cx="5" cy="3" r="1" />
                                <circle cx="11" cy="3" r="1" />
                                <circle cx="5" cy="8" r="1" />
                                <circle cx="11" cy="8" r="1" />
                                <circle cx="5" cy="13" r="1" />
                                <circle cx="11" cy="13" r="1" />
                              </svg>
                            </button>
                            <button
                              className="rounded-lg p-1.5 text-mint-400 transition-colors hover:bg-mint-50 hover:text-mint-700"
                              type="button"
                              onClick={() => setEditingQuestionId(question.questionId)}
                              aria-label={`Edit question ${index + 1}`}
                              title="Edit question"
                            >
                              ✎
                            </button>
                            <button
                              className="rounded-lg p-1.5 text-mint-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              type="button"
                              onClick={() => deleteQuestion(question)}
                              aria-label={`Delete question ${index + 1}`}
                              title="Delete question"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 className="mb-2 text-base font-medium text-mint-900">
                        {question.label || 'Untitled question'}
                      </h3>

                      {question.type === 'single_choice' || question.type === 'multi_choice' ? (
                        <div className="mb-4 space-y-2">
                          {(question.options || []).map((option) => (
                            <div className="flex items-center gap-2 text-sm text-mint-700" key={option.optionId}>
                              <span className={`h-4 w-4 border border-mint-300 ${
                                question.type === 'single_choice' ? 'rounded-full' : 'rounded'
                              }`} />
                              {option.label}
                            </div>
                          ))}
                        </div>
                      ) : question.type === 'rating' ? (
                        <div className="mb-4 flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <span
                              className="grid h-9 w-9 place-items-center rounded-lg border border-mint-200 text-sm text-mint-500"
                              key={rating}
                            >
                              {rating}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mb-4 border-b border-mint-100 py-2 text-sm text-mint-300">
                          Short answer
                        </div>
                      )}

                      {question.dependsOn && (
                        <p className="mb-0 text-xs text-mint-500">
                          Conditional question
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                {editingQuestionId && editable && (
                  <QuestionEditor
                    question={questionForEditor}
                    questions={questions}
                    onCancel={() => setEditingQuestionId(null)}
                    onSave={saveQuestion}
                  />
                )}

                {editable && (
                  <button
                    className="group mx-auto flex items-center gap-2 rounded-xl border-2 border-dashed border-mint-200 px-6 py-3 text-mint-500 transition-all hover:border-mint-400 hover:bg-mint-50 hover:text-mint-600"
                    type="button"
                    onClick={() => setEditingQuestionId('new')}
                    disabled={editingQuestionId === 'new'}
                  >
                    <svg className="h-5 w-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-medium">Add Question</span>
                  </button>
                )}
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}