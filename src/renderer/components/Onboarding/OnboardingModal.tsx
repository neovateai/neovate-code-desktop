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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Modal container */}
      <div className="relative flex flex-col rounded-lg shadow-xl overflow-hidden bg-muted border border-border w-[640px] max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {STEP_TITLES[onboardingStep] || 'Setup'}
          </h2>
          <button
            onClick={skipOnboarding}
            className="text-sm px-3 py-1 rounded-md transition-colors text-muted-foreground bg-transparent hover:bg-accent"
          >
            Skip
          </button>
        </div>

        {/* Progress indicator */}
        <OnboardingProgress />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[300px]">
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
