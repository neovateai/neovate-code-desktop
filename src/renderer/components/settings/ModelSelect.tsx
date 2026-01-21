import { useEffect, useState } from 'react';
import { useStore } from '../../store';
import {
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxEmpty,
} from '../ui/combobox';
import { Spinner } from '../ui/spinner';

interface GroupedModel {
  provider: string;
  providerId: string;
  models: { name: string; modelId: string; value: string }[];
}

interface ModelSelectProps {
  value: string | undefined;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export const ModelSelect = ({
  value,
  onChange,
  disabled,
}: ModelSelectProps) => {
  const request = useStore((state) => state.request);
  const state = useStore((state) => state.state);
  const [groupedModels, setGroupedModels] = useState<GroupedModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state !== 'connected') return;

    setLoading(true);
    request('models.list', { cwd: '/tmp' })
      .then((result) => {
        if (result.data?.groupedModels) {
          setGroupedModels(result.data.groupedModels);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch models:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [state, request]);

  const allModels = groupedModels.flatMap((group) =>
    group.models.map((model) => ({
      ...model,
      provider: group.provider,
      providerId: group.providerId,
    })),
  );

  const currentModel = allModels.find((m) => m.value === value);

  if (loading) {
    return (
      <div
        className="flex h-8 w-48 items-center justify-center rounded-lg border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <Spinner className="h-4 w-4" />
      </div>
    );
  }

  return (
    <Combobox
      value={value}
      onValueChange={(val: string | null) => {
        if (val) onChange(val);
      }}
      disabled={disabled}
    >
      <ComboboxInput
        placeholder={currentModel?.name || 'Select model...'}
        size="sm"
        className="w-48"
      />
      <ComboboxPopup>
        <ComboboxList>
          <ComboboxEmpty>No models found</ComboboxEmpty>
          {groupedModels.map((group) => (
            <ComboboxGroup key={group.providerId}>
              <ComboboxGroupLabel>{group.provider}</ComboboxGroupLabel>
              {group.models.map((model) => (
                <ComboboxItem key={model.value} value={model.value}>
                  {model.name}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          ))}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
};
