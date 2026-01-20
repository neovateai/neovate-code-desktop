import type { StateCreator } from 'zustand';

// Onboarding step identifiers
export type OnboardingStep =
  | 'import' // Step 1: Import projects from CLI
  | 'provider' // Step 2: Provider login
  | 'model' // Step 3: Model & smallModel config
  | 'config' // Step 4: Language, approval mode, theme
  | 'project'; // Step 5: Select a project to start

// Step order for navigation
const ONBOARDING_STEPS: OnboardingStep[] = [
  'import',
  'provider',
  'model',
  'config',
  'project',
];

// Imported project type from projects.list
export interface ImportedProject {
  path: string;
  lastAccessed: number | null;
  sessionCount: number;
}

// State
export interface OnboardingSliceState {
  // Current step
  onboardingStep: OnboardingStep;

  // Whether onboarding is complete (persisted)
  onboardingCompleted: boolean;

  // Whether modal is currently visible
  onboardingVisible: boolean;

  // Projects imported in step 1 (temporary, not persisted)
  importedProjects: ImportedProject[];
}

// Actions
export interface OnboardingSliceActions {
  // Navigation
  nextOnboardingStep: () => void;
  prevOnboardingStep: () => void;
  goToOnboardingStep: (step: OnboardingStep) => void;

  // Skip/Complete
  skipOnboarding: () => void;
  completeOnboarding: () => void;

  // For TestComponent control
  resetOnboarding: () => void;
  showOnboarding: () => void;
  hideOnboarding: () => void;

  // Step 1 helper
  setImportedProjects: (projects: ImportedProject[]) => void;
}

// Combined slice type
export type OnboardingSlice = OnboardingSliceState & OnboardingSliceActions;

// Initial state
export const defaultOnboardingState: OnboardingSliceState = {
  onboardingStep: 'import',
  onboardingCompleted: false,
  onboardingVisible: false,
  importedProjects: [],
};

// Slice creator
export const createOnboardingSlice: StateCreator<
  OnboardingSlice,
  [],
  [],
  OnboardingSlice
> = (set) => ({
  // Initial state
  ...defaultOnboardingState,

  // Navigation actions
  nextOnboardingStep: () =>
    set((state) => {
      const idx = ONBOARDING_STEPS.indexOf(state.onboardingStep);
      if (idx < ONBOARDING_STEPS.length - 1) {
        return { onboardingStep: ONBOARDING_STEPS[idx + 1] };
      }
      return state;
    }),

  prevOnboardingStep: () =>
    set((state) => {
      const idx = ONBOARDING_STEPS.indexOf(state.onboardingStep);
      if (idx > 0) {
        return { onboardingStep: ONBOARDING_STEPS[idx - 1] };
      }
      return state;
    }),

  goToOnboardingStep: (step: OnboardingStep) =>
    set({
      onboardingStep: step,
    }),

  // Skip/Complete actions
  skipOnboarding: () =>
    set({
      onboardingCompleted: true,
      onboardingVisible: false,
    }),

  completeOnboarding: () =>
    set({
      onboardingCompleted: true,
      onboardingVisible: false,
    }),

  // TestComponent control actions
  resetOnboarding: () =>
    set({
      onboardingCompleted: false,
      onboardingStep: 'import',
      onboardingVisible: true,
      importedProjects: [],
    }),

  showOnboarding: () =>
    set({
      onboardingVisible: true,
    }),

  hideOnboarding: () =>
    set({
      onboardingVisible: false,
    }),

  // Step 1 helper
  setImportedProjects: (projects: ImportedProject[]) =>
    set({
      importedProjects: projects,
    }),
});
