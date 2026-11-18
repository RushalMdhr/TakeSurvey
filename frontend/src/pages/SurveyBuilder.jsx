import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client.js';
import QuestionEditor from '../components/QuestionEditor.jsx';
import QuestionRenderer from '../components/QuestionRenderer.jsx';

export default function SurveyBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editingDetails, setEditingDetails] = useState(!id);
  const [publicUrl, setPublicUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
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

  async function moveQuestion(index, direction) {
    const reordered = [...questions];
    const targetIndex = index + direction;
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
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

  function cancelDetailsEdit() {
    setTitle(survey.title);
    setDescription(survey.description || '');
    setEditingDetails(false);
  }

  if (loading) {
    return <main className="page-container"><p className="quiet-state">Loading...</p></main>;
  }

  if (loadError) {
    return (
      <main className="page-container">
        <p className="notice notice-error" role="alert">{loadError}</p>
        <Link className="secondary-button" to="/dashboard">Back to surveys</Link>
      </main>
    );
  }

  const questionForEditor = activeQuestion || null;

  return (
    <main className="page-container builder-page">
      <Link className="back-link" to="/dashboard">← Surveys</Link>

      <div className="page-heading builder-heading">
        <div>
          <p className="eyebrow">{id ? (published ? 'Published survey' : 'Draft survey') : 'New survey'}</p>
          <h1>{id ? 'Build your survey' : 'Start a survey'}</h1>
        </div>
        {id && (
          <div className="publish-area">
            {published ? (
              <>
                <a className="primary-button" href={`/s/${encodeURIComponent(survey.slug)}`} target="_blank" rel="noreferrer">
                  Open survey ↗
                </a>
                {!survey.hasResponses && (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={unpublish}
                    disabled={unpublishing}
                  >
                    {unpublishing ? 'Unpublishing...' : 'Unpublish'}
                  </button>
                )}
              </>
            ) : (
              <button className="primary-button" type="button" onClick={publish} disabled={questions.length === 0}>
                Publish
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice notice-success" role="status">{notice}</p>}
      {published && (
        <div className="share-card">
          <span className="share-mark" aria-hidden="true">↗</span>
          <div>
            <strong>Share your survey</strong>
            <a href={publicUrl || `/s/${encodeURIComponent(survey.slug)}`} target="_blank" rel="noreferrer">
              {publicUrl || `${window.location.origin}/s/${survey.slug}`}
            </a>
          </div>
        </div>
      )}

      <div className="builder-grid">
        <section className="builder-column">
          {id && !editingDetails ? (
            <section className="survey-intro-view">
              <div>
                <h2>{survey.title}</h2>
                {survey.description && <p>{survey.description}</p>}
              </div>
              <button
                className="icon-button details-edit-button"
                type="button"
                onClick={() => setEditingDetails(true)}
                aria-label="Edit survey title and description"
                title="Edit survey details"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m13.8 3.2 3 3M4 16l3.8-.8L17 6a2.1 2.1 0 0 0-3-3L4.8 13.2 4 16Z" />
                </svg>
              </button>
            </section>
          ) : (
            <form className="editor-card metadata-form" onSubmit={saveSurvey}>
              <label className="field">
                Survey title
                <input
                  autoFocus
                  maxLength="120"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Weekend getaway"
                />
              </label>
              <label className="field">
                Description <span className="optional-label">optional</span>
                <textarea
                  rows="2"
                  maxLength="2000"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="A short introduction"
                />
              </label>
              <div className="form-actions">
                {id && (
                  <button className="secondary-button" type="button" onClick={cancelDetailsEdit}>
                    Cancel
                  </button>
                )}
                <button className="primary-button" type="submit" disabled={savingSurvey}>
                  {savingSurvey ? 'Saving...' : id ? 'Save details' : 'Create survey'}
                </button>
              </div>
            </form>
          )}

          {id && (
            <section className="questions-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Questions</p>
                  <h2>{questions.length} total</h2>
                </div>
                {!published && (
                  <button className="secondary-button" type="button" onClick={() => setEditingQuestionId('new')}>
                    + Add question
                  </button>
                )}
              </div>

              {editingQuestionId && !published && (
                <QuestionEditor
                  question={questionForEditor}
                  questions={questions}
                  onCancel={() => setEditingQuestionId(null)}
                  onSave={saveQuestion}
                />
              )}

              {questions.length === 0 ? (
                <div className="empty-card compact-empty">
                  <h3>No questions yet</h3>
                  {!published && <button className="text-button" type="button" onClick={() => setEditingQuestionId('new')}>Add your first question</button>}
                </div>
              ) : (
                <div className="question-list">
                  {questions.map((question, index) => (
                    <article className="question-row" key={question.questionId}>
                      <span className="question-index">{String(index + 1).padStart(2, '0')}</span>
                      <div className="question-row-copy">
                        <h3>{question.label}</h3>
                        <p>{question.type.replaceAll('_', ' ')}{question.required ? ' · required' : ''}</p>
                      </div>
                      {!published && (
                        <div className="question-row-actions">
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => moveQuestion(index, -1)}
                            disabled={index === 0}
                            aria-label="Move question up"
                            title="Move up"
                          >↑</button>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => moveQuestion(index, 1)}
                            disabled={index === questions.length - 1}
                            aria-label="Move question down"
                            title="Move down"
                          >↓</button>
                          <button className="icon-button" type="button" onClick={() => setEditingQuestionId(question.questionId)} aria-label="Edit question" title="Edit">✎</button>
                          <button className="icon-button danger-button" type="button" onClick={() => deleteQuestion(question)} aria-label="Delete question" title="Delete">×</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </section>

        {id && (
          <aside className="preview-panel">
            <div className="section-heading preview-heading">
              <div>
                <p className="eyebrow">Preview</p>
                <h2>{title || 'Your survey'}</h2>
              </div>
              <span className="preview-device" aria-label="Desktop preview">▱</span>
            </div>
            <div className="preview-paper">
              {description && <p className="preview-description">{description}</p>}
              <QuestionRenderer questions={questions} />
              <button className="primary-button preview-submit" type="button" disabled>Submit response</button>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}