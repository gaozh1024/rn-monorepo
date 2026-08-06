import type { Dispatch, SetStateAction } from 'react';

import type { PhotoAlbumItem } from '../types';

type PreviewCompleteCallback = ((photos: PhotoAlbumItem[]) => void) | undefined;

export type PreviewCommitScheduler = (callback: () => void) => void;

const schedulePreviewCommit: PreviewCommitScheduler = callback => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
    return;
  }

  setTimeout(callback, 0);
};

export function commitPreviewSelection(
  setPreviewIndex: Dispatch<SetStateAction<number | null>>,
  onComplete: PreviewCompleteCallback,
  photos: PhotoAlbumItem[],
  schedule: PreviewCommitScheduler = schedulePreviewCommit
) {
  setPreviewIndex(null);
  schedule(() => {
    onComplete?.(photos);
  });
}
