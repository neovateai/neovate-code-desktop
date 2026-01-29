import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CancelIcon } from '@hugeicons/core-free-icons';
import { Button } from '../ui';

interface ImagePreviewProps {
  images: Array<{
    imageId: string;
    base64: string;
    filename?: string;
  }>;
  onRemove: (imageId: string) => void;
}

export function ImagePreview({ images, onRemove }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 px-3 py-2 border-t border-border">
      {images.map(({ imageId, base64, filename }) => (
        <div
          key={imageId}
          className="relative group w-12 h-12 rounded-lg overflow-hidden border border-border"
        >
          <img
            src={base64}
            alt={filename || 'Pasted image'}
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            size="icon-xs"
            variant="destructive"
            onClick={() => onRemove(imageId)}
            className="absolute -top-1 -right-1 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <HugeiconsIcon icon={CancelIcon} size={10} />
          </Button>
        </div>
      ))}
    </div>
  );
}
