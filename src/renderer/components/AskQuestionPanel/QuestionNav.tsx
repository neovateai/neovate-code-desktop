import type { Question } from './types';

interface QuestionNavProps {
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  hideSubmitTab?: boolean;
}

export function QuestionNav({
  questions,
  currentIndex,
  answers,
  hideSubmitTab = false,
}: QuestionNavProps) {
  const isSingleHidden = questions.length === 1 && hideSubmitTab;

  if (isSingleHidden) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1">
      {/* Left arrow indicator */}
      <span
        className={`text-xs ${
          currentIndex === 0
            ? 'text-(--text-tertiary)'
            : 'text-(--text-secondary)'
        }`}
      >
        ←
      </span>

      {/* Question chips */}
      {questions.map((q, index) => {
        const isActive = index === currentIndex;
        const isAnswered = !!answers[q.question];
        const icon = isAnswered ? '☑' : '□';
        const label = q.header || `Q${index + 1}`;

        return (
          <span
            key={q.question}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
              isActive
                ? 'bg-blue-500 font-medium text-white'
                : isAnswered
                  ? 'text-(--text-primary)'
                  : 'text-(--text-tertiary)'
            }`}
          >
            {icon} {label}
          </span>
        );
      })}

      {/* Submit tab */}
      {!hideSubmitTab && (
        <span
          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${
            currentIndex === questions.length
              ? 'bg-blue-500 font-medium text-white'
              : 'text-(--text-tertiary)'
          }`}
        >
          ✓ Submit
        </span>
      )}

      {/* Right arrow indicator */}
      <span
        className={`text-xs ${
          currentIndex === questions.length
            ? 'text-(--text-tertiary)'
            : 'text-(--text-secondary)'
        }`}
      >
        →
      </span>
    </div>
  );
}
