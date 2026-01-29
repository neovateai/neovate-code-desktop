import { useStore, type OnboardingStep } from '../../store';
import { Button } from '../ui/button';

const STEPS: OnboardingStep[] = [
  'import',
  'provider',
  'model',
  'config',
  'project',
];

export const OnboardingFooter = () => {
  const onboardingStep = useStore((state) => state.onboardingStep);
  const nextOnboardingStep = useStore((state) => state.nextOnboardingStep);
  const prevOnboardingStep = useStore((state) => state.prevOnboardingStep);
  const completeOnboarding = useStore((state) => state.completeOnboarding);

  const currentIndex = STEPS.indexOf(onboardingStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEPS.length - 1;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border">
      {/* Back button */}
      <div>
        {!isFirst && (
          <Button variant="outline" size="sm" onClick={prevOnboardingStep}>
            Back
          </Button>
        )}
      </div>

      {/* Next / Finish button */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={isLast ? completeOnboarding : nextOnboardingStep}
        >
          {isLast ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
};
