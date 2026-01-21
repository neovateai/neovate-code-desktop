import { useStore, type OnboardingStep } from '../../store';

const STEPS: OnboardingStep[] = [
  'import',
  'provider',
  'model',
  'config',
  'project',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  import: 'Import',
  provider: 'Provider',
  model: 'Models',
  config: 'Config',
  project: 'Start',
};

export const OnboardingProgress = () => {
  const onboardingStep = useStore((state) => state.onboardingStep);
  const currentIndex = STEPS.indexOf(onboardingStep);

  return (
    <div
      className="flex items-center justify-center gap-2 px-6 py-3"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {STEPS.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div key={step} className="flex items-center gap-2">
            {/* Step indicator */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor:
                    isActive || isCompleted
                      ? 'var(--primary)'
                      : 'var(--bg-surface)',
                  color:
                    isActive || isCompleted
                      ? 'var(--primary-foreground)'
                      : 'var(--text-secondary)',
                  border:
                    isActive || isCompleted
                      ? 'none'
                      : '1px solid var(--border-subtle)',
                }}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className="text-xs"
                style={{
                  color: isActive
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                {STEP_LABELS[step]}
              </span>
            </div>

            {/* Connector line (except after last step) */}
            {index < STEPS.length - 1 && (
              <div
                className="w-8 h-0.5 mb-5"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--accent)'
                    : 'var(--border-subtle)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
