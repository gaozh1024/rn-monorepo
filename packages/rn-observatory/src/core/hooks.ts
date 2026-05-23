import { useContext } from 'react';
import { AppObservatoryContext } from './context';

export function useAppObservatory() {
  return useContext(AppObservatoryContext);
}
