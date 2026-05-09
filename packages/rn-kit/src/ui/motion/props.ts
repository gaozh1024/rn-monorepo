import type {
  MotionEntryExitAnimation,
  MotionLayoutAnimation,
  MotionLayoutPreset,
  MotionSpringPreset,
  PresencePreset,
  PressMotionPreset,
} from './types';

export interface PressMotionProps {
  /** 按压动画预设 */
  motionPreset?: PressMotionPreset;
  /** 按压动画时长 */
  motionDuration?: number;
  /** 是否关闭按压动画 */
  motionReduceMotion?: boolean;
}

export interface LayoutMotionProps {
  /** 组件挂载时的 entering 动画 */
  motionEntering?: MotionEntryExitAnimation;
  /** 组件卸载时的 exiting 动画 */
  motionExiting?: MotionEntryExitAnimation;
  /** 组件布局变化时的 layout 动画 */
  motionLayout?: MotionLayoutAnimation;
  /** 高级布局动画预设 */
  motionLayoutPreset?: MotionLayoutPreset;
  /** 高级布局动画预设时长 */
  motionLayoutDuration?: number;
  /** 高级布局动画预设延迟 */
  motionLayoutDelay?: number;
  /** 高级布局动画预设 spring 配置 */
  motionLayoutSpring?: MotionSpringPreset;
}

export interface PresenceMotionProps extends LayoutMotionProps {
  /** 动画预设 */
  motionPreset?: PresencePreset;
  /** 统一进入/退出动画时长 */
  motionDuration?: number;
  /** 单独控制进入动画时长 */
  motionEnterDuration?: number;
  /** 单独控制退出动画时长 */
  motionExitDuration?: number;
  /** 位移动画距离 */
  motionDistance?: number;
  /** 是否关闭该动画 */
  motionReduceMotion?: boolean;
}

export interface SheetMotionProps {
  /** 统一面板开合动画时长 */
  motionDuration?: number;
  /** 面板打开动画时长 */
  motionOpenDuration?: number;
  /** 面板关闭动画时长 */
  motionCloseDuration?: number;
  /** 面板关闭时的位移距离 */
  motionDistance?: number;
  /** 遮罩最大透明度 */
  motionOverlayOpacity?: number;
  /** 手势关闭阈值 */
  motionSwipeThreshold?: number;
  /** 手势关闭速度阈值 */
  motionVelocityThreshold?: number;
  /** 是否关闭该动画 */
  motionReduceMotion?: boolean;
}

export interface ProgressMotionProps {
  /** 进度变化动画时长 */
  motionDuration?: number;
  /** 进度变化动画 spring 预设 */
  motionSpringPreset?: MotionSpringPreset;
  /** 是否关闭进度动画 */
  motionReduceMotion?: boolean;
}

export interface ToggleMotionProps {
  /** 是否启用状态切换动画，默认 true */
  animated?: boolean;
  /** 状态切换动画时长 */
  motionDuration?: number;
  /** 状态切换动画 spring 预设 */
  motionSpringPreset?: MotionSpringPreset;
  /** 是否关闭切换动画 */
  motionReduceMotion?: boolean;
}

export interface StaggerMotionProps extends LayoutMotionProps {
  /** 非错峰布局动画是否关闭 */
  motionReduceMotion?: boolean;
  /** 错峰入场预设 */
  staggerPreset?: Extract<PresencePreset, 'fade' | 'fadeUp' | 'fadeDown' | 'scaleFade'>;
  /** 错峰间隔（ms） */
  staggerMs?: number;
  /** 基础延迟（ms） */
  staggerBaseDelayMs?: number;
  /** 单项动画时长 */
  staggerDuration?: number;
  /** 单项位移距离 */
  staggerDistance?: number;
  /** 是否关闭错峰动画 */
  staggerReduceMotion?: boolean;
}
