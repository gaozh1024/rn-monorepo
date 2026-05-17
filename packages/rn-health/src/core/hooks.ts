import { useContext } from 'react';
import { AppHealthContext } from './context';

export function useAppHealth() {
  return useContext(AppHealthContext);
}
