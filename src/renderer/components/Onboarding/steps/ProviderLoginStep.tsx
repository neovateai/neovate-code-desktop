import { ProvidersPanel } from '../../settings/ProvidersPanel';

export const ProviderLoginStep = () => {
  return (
    <div
      className="overflow-y-auto"
      style={{
        // Remove the header from ProvidersPanel by hiding it
        // and limit height for scrolling
        maxHeight: '400px',
      }}
    >
      <style>
        {`
          .onboarding-providers-panel > h1 {
            display: none;
          }
        `}
      </style>
      <div className="onboarding-providers-panel">
        <ProvidersPanel />
      </div>
    </div>
  );
};
