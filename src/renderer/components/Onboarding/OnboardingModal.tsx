import { useStore } from '../../store';
import { OnboardingProgress } from './OnboardingProgress';
import { OnboardingFooter } from './OnboardingFooter';
import { ImportProjectsStep } from './steps/ImportProjectsStep';
import { ProviderLoginStep } from './steps/ProviderLoginStep';
import { ModelConfigStep } from './steps/ModelConfigStep';
import { GeneralConfigStep } from './steps/GeneralConfigStep';
import { SelectProjectStep } from './steps/SelectProjectStep';

const STEP_TITLES: Record<string, string> = {
  import: 'Onboarding: Import Projects',
  provider: 'Onboarding: Configure Provider',
  model: 'Onboarding: Select Models',
  config: 'Onboarding: Preferences',
  project: 'Onboarding: Select a Project',
};

export const OnboardingModal = () => {
  const onboardingVisible = useStore((state) => state.onboardingVisible);
  const onboardingStep = useStore((state) => state.onboardingStep);
  const skipOnboarding = useStore((state) => state.skipOnboarding);

  if (!onboardingVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      {/* Modal container */}
      <div
        className="relative flex flex-col rounded-lg shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          width: '640px',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {STEP_TITLES[onboardingStep] || 'Setup'}
          </h2>
          <button
            onClick={skipOnboarding}
            className="text-sm px-3 py-1 rounded-md transition-colors"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-base-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Skip
          </button>
        </div>

        {/* Progress indicator */}
        <OnboardingProgress />

        {/* Step content */}
        <div
          className="flex-1 overflow-y-auto px-6 py-4"
          style={{ minHeight: '300px' }}
        >
          {onboardingStep === 'import' && <ImportProjectsStep />}
          {onboardingStep === 'provider' && <ProviderLoginStep />}
          {onboardingStep === 'model' && <ModelConfigStep />}
          {onboardingStep === 'config' && <GeneralConfigStep />}
          {onboardingStep === 'project' && <SelectProjectStep />}
        </div>

        {/* Footer with navigation */}
        <OnboardingFooter />
      </div>
    </div>
  );
};
