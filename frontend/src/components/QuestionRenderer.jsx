const choiceTypes = new Set(['single_choice', 'multi_choice']);

export default function QuestionRenderer({ questions }) {
  const questionById = new Map(questions.map((question) => [question.questionId, question]));

  if (questions.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded-xl border border-mint-100 bg-mint-50/50 px-5 py-8 text-center text-sm text-mint-600">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-100 text-xl text-mint-700" aria-hidden="true">
          +
        </span>
        <p className="mb-0">Your questions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {questions.map((question) => {
        const condition = question.dependsOn;
        const parent = condition?.questionId && questionById.get(condition.questionId);
        const option = parent?.options?.find((item) => item.optionId === condition.optionId);

        return (
          <section
            className="rounded-xl border border-mint-100 bg-mint-50/50 p-5 transition-all hover:shadow-[0_4px_20px_rgba(20,184,156,0.08)]"
            key={question.questionId}
          >
            <h3 className="mb-3 text-sm font-medium text-mint-800">
              {question.label || 'Untitled question'}
              {question.required && <span className="ml-1 text-red-400">*</span>}
            </h3>
            {parent && option && (
              <p className="mb-3 text-xs text-mint-600">When {parent.label}: {option.label}</p>
            )}
            <div>
              {choiceTypes.has(question.type) ? (
                <div className="space-y-2">
                  {(question.options || []).map((item) => (
                    <span className="flex items-center gap-3 rounded-lg p-2.5 text-sm text-mint-700" key={item.optionId || item.label}>
                      <span className={`h-4 w-4 border border-mint-300 ${
                        question.type === 'single_choice' ? 'rounded-full' : 'rounded'
                      }`} />
                      {item.label}
                    </span>
                  ))}
                </div>
              ) : question.type === 'rating' ? (
                <div className="flex gap-2" aria-label="Rating from 1 to 5">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <span className="grid h-10 w-10 place-items-center rounded-lg border border-mint-200 text-sm text-mint-500" key={rating}>
                      {rating}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="w-full rounded-lg border border-mint-200 bg-white px-4 py-2.5 text-sm text-mint-300">
                  Your answer...
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}