import { useAppSafeAreaInsets } from '@/ui/layout';
import { DEFAULT_BOTTOM_TAB_BAR_HEIGHT } from '../constants';

export interface BottomTabBarMetrics {
  contentHeight: number;
  safeAreaBottom: number;
  totalHeight: number;
}

export interface UseBottomTabBarMetricsOptions {
  height?: number;
}

export function useBottomTabBarMetrics(
  options: UseBottomTabBarMetricsOptions = {}
): BottomTabBarMetrics {
  const insets = useAppSafeAreaInsets();
  const contentHeight = options.height ?? DEFAULT_BOTTOM_TAB_BAR_HEIGHT;
  const safeAreaBottom = insets.bottom;

  return {
    contentHeight,
    safeAreaBottom,
    totalHeight: contentHeight + safeAreaBottom,
  };
}
