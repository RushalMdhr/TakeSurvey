import { useState } from 'react';

const questionTypes = [
  ['text', 'Short answer'],
  ['single_choice', 'Single choice'],
  ['multi_choice', 'Multiple choice'],
  ['rating', 'Rating (1–5)']
];

const choiceTypes = new Set(['single_choice', 'multi_choice']);

export default function QuestionEditor({ question, questions, onCancel, onSave }) {
  const [type, setType] = useState(question?.type || 'text');
  const [label, setLabel] = useState(question?.label || '');
  const [required, setRequired] = useState(question?.required || false);
  const [options, setOptions] = useState(
    question?.options?.map((option) => ({ ...option })) || []
  );
  const [dependsOnQuestionId, setDependsOnQuestionId] = useState(
    question?.dependsOn?.questionId || ''
  );
  const [dependsOnOptionId, setDependsOnOptionId] = useState(
    question?.dependsOn?.optionId || ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const candidates = questions.filter((item) => (
    item.questionId !== question?.questionId &&
    choiceTypes.has(item.type) &&
    (question ? item.position < question.position : true)
  ));
  const dependency = candidates.find((item) => item.questionId === dependsOnQuestionId);

  function changeType(nextType) {
    setType(nextType);
    if (choiceTypes.has(nextType) && options.length === 0) {
      setOptions([{ label: '' }, { label: '' }]);
    }
  }

  function updateOption(index, labelValue) {
    setOptions((current) => current.map((option, optionIndex) => (
      optionIndex === index ? { ...option, label: labelValue } : option
    )));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');

    if (!label.trim()) {
      setError('Add a question.');
      return;
    }
    if (choiceTypes.has(type) && (options.length < 2 || options.some((option) => !option.label.trim()))) {
      setError('Add at least two options.');
      return;
    }
    if (dependsOnQuestionId && !dependsOnOptionId) {
      setError('Choose the answer that reveals this question.');
      return;
    }

    const payload = { type, label: label.trim(), required };
    if (choiceTypes.has(type)) {
      payload.options = options.map(({ optionId, label: optionLabel }) => ({
        ...(question && optionId ? { optionId } : {}),
        label: optionLabel.trim()
      }));
    }
    if (dependsOnQuestionId) {
      payload.dependsOn = {
        questionId: dependsOnQuestionId,
        optionId: dependsOnOptionId
      };
    } else if (question) {
      payload.dependsOn = null;
    }

    setSaving(true);
    try {
      await onSave(payload);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not save this question.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="editor-card question-form" onSubmit={submit}>
      <div className="card-heading">
        <h2>{question ? 'Edit question' : 'New question'}</h2>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Close">×</button>
      </div>

      <label className="field">
        Question
        <input
          autoFocus
          maxLength="500"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="What would you like to know?"
        />
      </label>

      <div className="field-grid">
        <label className="field">
          Answer type
          <select value={type} onChange={(event) => changeType(event.target.value)}>
            {questionTypes.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
          </select>
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          Required
        </label>
      </div>

      {choiceTypes.has(type) && (
        <div className="option-editor">
          <div className="section-label">Answer options</div>
          {options.map((option, index) => (
            <div className="option-edit-row" key={option.optionId || index}>
              <span className="option-dot" aria-hidden="true" />
              <input
                aria-label={`Option ${index + 1}`}
                value={option.label}
                maxLength="200"
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove option ${index + 1}`}
                onClick={() => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))}
              >
                ×
              </button>
            </div>
          ))}
          <button className="text-button add-option" type="button" onClick={() => setOptions((current) => [...current, { label: '' }])}>
            + Add option
          </button>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="condition-editor">
          <label className="field">
            Show only when
            <select
              value={dependsOnQuestionId}
              onChange={(event) => {
                const nextQuestionId = event.target.value;
                const nextParent = candidates.find((item) => item.questionId === nextQuestionId);
                setDependsOnQuestionId(nextQuestionId);
                setDependsOnOptionId(nextParent?.options?.[0]?.optionId || '');
              }}
            >
              <option value="">Always show</option>
              {candidates.map((item) => <option value={item.questionId} key={item.questionId}>{item.label}</option>)}
            </select>
          </label>
          {dependency && (
            <label className="field">
              Answer is
              <select value={dependsOnOptionId} onChange={(event) => setDependsOnOptionId(event.target.value)}>
                <option value="">Choose an answer</option>
                {dependency.options.map((option) => (
                  <option value={option.optionId} key={option.optionId}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save question'}
        </button>
      </div>
    </form>
  );
}