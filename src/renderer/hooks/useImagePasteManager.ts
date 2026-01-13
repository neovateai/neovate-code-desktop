import { useCallback, useRef } from 'react';
import { useStore } from '../store';

export interface ImagePasteResult {
  success: boolean;
  imageId?: string;
  prompt?: string;
  dimensions?: { width: number; height: number };
}

function getImageDimensions(
  base64: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 100, height: 100 });
    img.src = base64;
  });
}

function truncateFilename(filename: string, maxLength = 20): string {
  if (filename.length <= maxLength) return filename;
  const ext = filename.split('.').pop() || '';
  const name = filename.substring(0, filename.lastIndexOf('.'));
  const availableLength = maxLength - ext.length - 4;
  const prefixLen = Math.ceil(availableLength / 2);
  const suffixLen = Math.floor(availableLength / 2);
  return `${name.substring(0, prefixLen)}...${name.slice(-suffixLen)}.${ext}`;
}

export function useImagePasteManager(
  sessionId: string | null,
  pastedImageMap: Record<string, string>,
  setPastedImageMap: (map: Record<string, string>) => void,
) {
  const counterRef = useRef(0);

  const generateImageId = useCallback(() => `#${++counterRef.current}`, []);

  const handleImagePaste = useCallback(
    async (file: File): Promise<ImagePasteResult> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const imageId = generateImageId();
          const dimensions = await getImageDimensions(base64);
          const filename = truncateFilename(file.name || 'image.png');

          const newMap = { ...pastedImageMap, [imageId]: base64 };
          setPastedImageMap(newMap);

          resolve({
            success: true,
            imageId,
            dimensions,
            prompt: `[Image ${dimensions.width}X${dimensions.height} ${filename}${imageId}]`,
          });
        };
        reader.onerror = () => resolve({ success: false });
        reader.readAsDataURL(file);
      });
    },
    [generateImageId, pastedImageMap, setPastedImageMap, sessionId],
  );

  const getPastedImage = useCallback(
    (imageId: string) => pastedImageMap[imageId],
    [pastedImageMap],
  );

  const removePastedImage = useCallback(
    (imageId: string) => {
      const newMap = { ...pastedImageMap };
      delete newMap[imageId];
      setPastedImageMap(newMap);
    },
    [pastedImageMap, setPastedImageMap],
  );

  const expandImageReferences = useCallback(
    (message: string): { expandedMessage: string; images: string[] } => {
      const images: string[] = [];
      let expandedMessage = message;
      const regex = /\[Image \d+X\d+ [^\]]+#(\d+)\]/g;
      const matches = [...message.matchAll(regex)];

      const storeState = useStore.getState();
      const sessionInput = sessionId
        ? storeState.inputBySession[sessionId]
        : null;
      const currentImageMap = sessionInput?.pastedImageMap ?? {};

      for (const match of matches) {
        const imageId = `#${match[1]}`;
        const imageData = currentImageMap[imageId];
        if (imageData) {
          images.push(imageData);
          expandedMessage = expandedMessage.replace(match[0], '').trim();
        }
      }

      return { expandedMessage, images };
    },
    [sessionId],
  );

  return {
    pastedImageMap,
    handleImagePaste,
    getPastedImage,
    removePastedImage,
    expandImageReferences,
  };
}
