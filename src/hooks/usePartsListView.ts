import { useEffect, useState } from 'react';

export type PartsListView = 'compact' | 'images' | 'table';

const STORAGE_KEY = 'parts_list_view';

export function usePartsListView() {
  const [view, setViewState] = useState<PartsListView>('compact');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'compact' || stored === 'images' || stored === 'table') {
      setViewState(stored);
    }
  }, []);

  const setView = (next: PartsListView) => {
    setViewState(next);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return { view, setView, isImageView: view === 'images' };
}
