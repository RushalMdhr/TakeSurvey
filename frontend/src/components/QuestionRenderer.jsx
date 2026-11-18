const choiceTypes = new Set(['single_choice', 'multi_choice']);

export default function QuestionRenderer({ questions }) {
  const questionById = new Map(questions.map((question) => [question.questionId, question]));

  if (questions.length === 0) {
    return (
      <div className="preview-empty">
        <span className="empty-mark" aria-hidden="true">+</span>
        <p>Your questions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="preview-survey">
      {questions.map((question, index) => {
        const condition = question.dependsOn;
        const parent = condition?.questionId && questionById.get(condition.questionId);
        const option = parent?.options?.find((item) => item.optionId === condition.optionId);

        return (
          <section className="preview-question" key={question.questionId}>
            <div className="preview-number">{String(index + 1).padStart(2, '0')}</div>
            <div className="preview-content">
              <h3>{question.label || 'Untitled question'}{question.required && <span className="required-mark"> *</span>}</h3>
              {parent && option && <p className="preview-condition">When {parent.label}: {option.label}</p>}
              {choiceTypes.has(question.type) ? (
                <div className="preview-options">
                  {(question.options || []).map((item) => (
                    <span className="preview-option" key={item.optionId || item.label}>
                      <span className={question.type === 'single_choice' ? 'radio-preview' : 'check-preview'} />
                      {item.label}
                    </span>
                  ))}
                </div>
              ) : question.type === 'rating' ? (
                <div className="preview-rating" aria-label="Rating from 1 to 5">
                  {[1, 2, 3, 4, 5].map((rating) => <span key={rating}>{rating}</span>)}
                </div>
              ) : (
                <div className="preview-text-line">Short answer</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}