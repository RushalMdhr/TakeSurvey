import { useState } from 'react';

const questionTypes = [
  ['text', 'Text'],
  ['single_choice', 'Single Select'],
  ['multi_choice', 'Multi Select'],
  ['rating', 'Rating']
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
    <form
      className="space-y-5 rounded-2xl border border-mint-100 bg-white p-5 shadow-sm sm:p-6"
      onSubmit={submit}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="mb-0 text-lg font-semibold text-mint-900">
          {question ? 'Edit question' : 'New question'}
        </h2>
        <button
          className="rounded-lg p-2 text-mint-400 transition-colors hover:bg-mint-50 hover:text-mint-700"
          type="button"
          onClick={onCancel}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label className="grid gap-2 text-sm font-medium text-mint-800">
        Question
        <input
          autoFocus
          maxLength="500"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="What would you like to know?"
          className="w-full rounded-lg border border-mint-200 bg-white px-4 py-2.5 text-sm font-normal text-mint-900 placeholder:text-mint-300 focus:border-mint-400 focus:outline-none focus:ring-2 focus:ring-mint-300/40"
        />
      </label>

      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-2 text-sm font-medium text-mint-800">
          Answer type
          <select
            className="w-full rounded-lg border border-mint-200 bg-white px-4 py-2.5 text-sm font-normal text-mint-900 focus:border-mint-400 focus:outline-none focus:ring-2 focus:ring-mint-300/40"
            value={type}
            onChange={(event) => changeType(event.target.value)}
          >
            {questionTypes.map(([value, name]) => <option value={value} key={value}>{name}</option>)}
          </select>
        </label>
        <label className="flex min-h-10 items-center gap-2 whitespace-nowrap text-sm text-mint-700">
          <input
            className="h-4 w-4 accent-mint-500"
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
          />
          Required
        </label>
      </div>

      {choiceTypes.has(type) && (
        <div className="grid gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-mint-700">Answer options</div>
          {options.map((option, index) => (
            <div className="flex items-center gap-2" key={option.optionId || index}>
              <span className="h-4 w-4 shrink-0 rounded-full border border-mint-300" aria-hidden="true" />
              <input
                className="w-full min-w-0 rounded-lg border border-mint-200 bg-white px-3 py-2 text-sm text-mint-900 placeholder:text-mint-300 focus:border-mint-400 focus:outline-none focus:ring-2 focus:ring-mint-300/40"
                aria-label={`Option ${index + 1}`}
                value={option.label}
                maxLength="200"
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder={`Option ${index + 1}`}
              />
              <button
                className="rounded-lg p-2 text-mint-300 transition-colors hover:bg-red-50 hover:text-red-500"
                type="button"
                aria-label={`Remove option ${index + 1}`}
                onClick={() => setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="justify-self-start text-sm text-mint-500 transition-colors hover:text-mint-700"
            type="button"
            onClick={() => setOptions((current) => [...current, { label: '' }])}
          >
            + Add option
          </button>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-mint-800">
            Show only when
            <select
              className="w-full rounded-lg border border-mint-200 bg-white px-4 py-2.5 text-sm font-normal text-mint-900 focus:border-mint-400 focus:outline-none focus:ring-2 focus:ring-mint-300/40"
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
            <label className="grid gap-2 text-sm font-medium text-mint-800">
              Answer is
              <select
                className="w-full rounded-lg border border-mint-200 bg-white px-4 py-2.5 text-sm font-normal text-mint-900 focus:border-mint-400 focus:outline-none focus:ring-2 focus:ring-mint-300/40"
                value={dependsOnOptionId}
                onChange={(event) => setDependsOnOptionId(event.target.value)}
              >
                <option value="">Choose an answer</option>
                {dependency.options.map((option) => (
                  <option value={option.optionId} key={option.optionId}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-1">
        <button
          className="rounded-xl border border-mint-200 px-5 py-2.5 text-sm font-medium text-mint-700 transition-colors hover:bg-mint-50"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="rounded-xl bg-mint-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-mint-600 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save question'}
        </button>
      </div>
    </form>
  );
}