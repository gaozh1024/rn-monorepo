import React from 'react';
import { vi, beforeAll, beforeEach, afterAll } from 'vitest';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const createNativeComponent = (displayName: string) => {
  const Component = React.forwardRef<any, any>(({ children, onPress, testID, ...props }, ref) =>
    React.createElement(
      displayName,
      {
        ...props,
        ref,
        onClick: onPress,
        'data-testid': testID,
      },
      children
    )
  );
  Component.displayName = displayName;
  return Component;
};

const createNavigator = () => ({
  Navigator: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Screen: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
});

let lastBottomTabNavigatorProps: any = null;
let lastStackNavigatorProps: any = null;
let lastStackScreenProps: any[] = [];
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalStderrWrite = process.stderr.write.bind(process.stderr);

const shouldIgnoreTestNoise = (value: string) =>
  value.includes('react-test-renderer is deprecated') ||
  value.includes('An update to Switch inside a test was not wrapped in act') ||
  value.includes('An update to AppPressable inside a test was not wrapped in act') ||
  value.includes('An update to CollapseView inside a test was not wrapped in act') ||
  value.includes('An update to BottomSheetModal inside a test was not wrapped in act');

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((message?: unknown, ...args: unknown[]) => {
    const combined = [message, ...args]
      .map(item => (typeof item === 'string' ? item : String(item)))
      .join(' ');

    if (shouldIgnoreTestNoise(combined)) {
      return;
    }

    originalConsoleError(message as any, ...args);
  });
  vi.spyOn(console, 'warn').mockImplementation((message?: unknown, ...args: unknown[]) => {
    const combined = [message, ...args]
      .map(item => (typeof item === 'string' ? item : String(item)))
      .join(' ');

    if (shouldIgnoreTestNoise(combined)) {
      return;
    }

    originalConsoleWarn(message as any, ...args);
  });

  process.stderr.write = ((chunk: any, encoding?: any, cb?: any) => {
    const text = typeof chunk === 'string' ? chunk : (chunk?.toString?.(encoding) ?? '');
    if (shouldIgnoreTestNoise(text)) {
      if (typeof cb === 'function') cb();
      return true;
    }
    return originalStderrWrite(chunk, encoding, cb);
  }) as typeof process.stderr.write;
});

afterAll(() => {
  vi.restoreAllMocks();
  process.stderr.write = originalStderrWrite as typeof process.stderr.write;
});

global.fetch = vi.fn();

vi.mock('@testing-library/react-native', async () => {
  const ReactTestRenderer = await vi.importActual<any>('react-test-renderer');
  const { act, create } = ReactTestRenderer;
  const React = await vi.importActual<any>('react');

  const getTextContent = (node: any): string => {
    if (typeof node === 'string') return node;
    if (!node || !node.children) return '';
    return node.children.map((child: any) => getTextContent(child)).join('');
  };

  const findByTestId = (root: any, testId: string) => {
    const node = root.find(
      (item: any) =>
        typeof item?.type === 'string' &&
        (item?.props?.testID === testId || item?.props?.['data-testid'] === testId)
    );
    let current = node;
    while (current && current.props && current.props.className === undefined && current.parent) {
      current = current.parent;
    }
    return current ?? node;
  };

  const findByText = (root: any, text: string) =>
    (() => {
      const candidates = root.findAll((node: any) => {
        if (typeof node?.type !== 'string') return false;
        return getTextContent(node) === text;
      });
      if (!candidates.length) {
        throw new Error(`Unable to find text: ${text}`);
      }
      const interactive = candidates.find(
        (item: any) =>
          typeof item?.parent?.props?.onPress === 'function' ||
          item?.parent?.props?.disabled !== undefined
      );
      if (interactive) return interactive;
      const preferred = candidates.find((item: any) => item.type === 'Text');
      return preferred ?? candidates[candidates.length - 1];
    })();

  const findByPlaceholderText = (root: any, text: string) => {
    const node = root.find(
      (item: any) => typeof item?.type === 'string' && item?.props?.placeholder === text
    );
    return node;
  };

  const decorateNode = (node: any) => {
    if (node && node.props) {
      (node as any).className = node.props.className;
    }
    return node;
  };

  const withInteractiveParent = (node: any) => {
    let current = node?.parent;
    let onPressParent: any = null;
    while (current) {
      if (
        typeof current?.props?.className === 'string' &&
        (current.props.className.includes('border-2') || current.props.className.includes('bg-'))
      ) {
        return {
          props: node.props,
          parent: current,
          children: node.children,
          type: node.type,
        };
      }
      if (!onPressParent && typeof current?.props?.onPress === 'function') {
        onPressParent = current;
      }
      current = current.parent;
    }
    if (onPressParent) {
      return {
        props: node.props,
        parent: onPressParent,
        children: node.children,
        type: node.type,
      };
    }
    return node;
  };

  const findPressHandler = (node: any): (() => void) | undefined => {
    let current = node;
    while (current) {
      if (current?.props?.disabled === true) return undefined;
      if (typeof current?.props?.onPress === 'function') return current.props.onPress;
      current = current.parent;
    }
    return undefined;
  };

  const findGestureHandler = (node: any, handlerName: 'onPressIn' | 'onPressOut') => {
    let current = node;
    while (current) {
      if (current?.props?.disabled === true) return undefined;
      if (typeof current?.props?.[handlerName] === 'function') return current.props[handlerName];
      current = current.parent;
    }
    return undefined;
  };

  return {
    render: (ui: React.ReactElement) => {
      let renderer: any;
      act(() => {
        renderer = create(ui);
      });

      const getRoot = () => renderer.root;
      const getByTestId = (testId: string) => decorateNode(findByTestId(getRoot(), testId));
      const getAllByTestId = (testId: string) =>
        getRoot()
          .findAll(
            (item: any) =>
              typeof item?.type === 'string' &&
              (item?.props?.testID === testId || item?.props?.['data-testid'] === testId)
          )
          .map((item: any) => decorateNode(item));
      const queryByTestId = (testId: string) => {
        try {
          return decorateNode(findByTestId(getRoot(), testId));
        } catch {
          return null;
        }
      };
      const getByText = (text: string) =>
        decorateNode(withInteractiveParent(findByText(getRoot(), text)));
      const queryByText = (text: string) => {
        try {
          return decorateNode(withInteractiveParent(findByText(getRoot(), text)));
        } catch {
          return null;
        }
      };
      const getByPlaceholderText = (text: string) =>
        decorateNode(findByPlaceholderText(getRoot(), text));
      const queryByPlaceholderText = (text: string) => {
        try {
          return decorateNode(findByPlaceholderText(getRoot(), text));
        } catch {
          return null;
        }
      };

      const flattenStyle = (style: any): Record<string, any> => {
        if (!style) return {};
        if (Array.isArray(style)) {
          return style.reduce((acc, item) => ({ ...acc, ...flattenStyle(item) }), {});
        }
        if (typeof style === 'object') return style;
        return {};
      };

      const container = {
        querySelector: (selector: string) => {
          const nodes = getRoot().findAll((node: any) => typeof node?.type === 'string');
          if (selector.startsWith('.')) {
            const className = selector.slice(1);
            const found = nodes.find((node: any) =>
              (node.props?.className || '').includes(className)
            );
            return found ? decorateNode(found) : null;
          }
          const widthMatch = selector.match(/width:\s*([0-9.]+%)/);
          if (widthMatch) {
            const width = widthMatch[1];
            const found = nodes.find(
              (node: any) => flattenStyle(node.props?.style).width === width
            );
            return found ? decorateNode(found) : null;
          }
          return null;
        },
      };

      return {
        container,
        getByTestId,
        getAllByTestId,
        queryByTestId,
        getByText,
        queryByText,
        getByPlaceholderText,
        queryByPlaceholderText,
        unmount: () => {
          act(() => {
            renderer.unmount();
          });
        },
        rerender: (nextUi: React.ReactElement) => {
          act(() => {
            renderer.update(nextUi);
          });
          act(() => {});
        },
      };
    },
    renderHook: (hook: any, options?: any) => {
      let result: any = { current: null };
      const TestComponent = () => {
        result.current = hook();
        return null;
      };
      const wrapper = options?.wrapper;
      const WrappedComponent = wrapper
        ? () => React.createElement(wrapper, { children: React.createElement(TestComponent) })
        : TestComponent;
      let renderer: any;
      act(() => {
        renderer = create(React.createElement(WrappedComponent));
      });
      return {
        result,
        unmount: () => {
          act(() => {
            renderer?.unmount();
          });
        },
        rerender: () => {
          act(() => {
            renderer.update(React.createElement(WrappedComponent));
          });
        },
      };
    },
    fireEvent: {
      press: (element: any) => {
        const onPress = findPressHandler(element);
        if (onPress) {
          act(() => {
            onPress({
              nativeEvent: {},
              preventDefault: () => {},
              stopPropagation: () => {},
            });
          });
          act(() => {});
        }
      },
      pressIn: (element: any) => {
        const onPressIn = findGestureHandler(element, 'onPressIn');
        if (onPressIn) {
          act(() => {
            onPressIn({
              nativeEvent: {},
              preventDefault: () => {},
              stopPropagation: () => {},
            });
          });
          act(() => {});
        }
      },
      pressOut: (element: any) => {
        const onPressOut = findGestureHandler(element, 'onPressOut');
        if (onPressOut) {
          act(() => {
            onPressOut({
              nativeEvent: {},
              preventDefault: () => {},
              stopPropagation: () => {},
            });
          });
          act(() => {});
        }
      },
      changeText: (element: any, value: string) => {
        if (typeof element?.props?.onChangeText === 'function') {
          act(() => {
            element.props.onChangeText(value);
          });
          act(() => {});
          return;
        }
        if (typeof element?.props?.onChange === 'function') {
          act(() => {
            element.props.onChange({ nativeEvent: { text: value } });
          });
          act(() => {});
        }
      },
    },
  };
});

// Mock Animated
const interpolateValue = (
  value: number,
  inputRange: number[],
  outputRange: Array<number | string>
) => {
  const [inputStart, inputEnd] = inputRange;
  const [outputStart, outputEnd] = outputRange;
  const ratio = inputEnd === inputStart ? 0 : (value - inputStart) / (inputEnd - inputStart);
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);

  if (typeof outputStart === 'string' && typeof outputEnd === 'string') {
    const start = Number.parseFloat(outputStart);
    const end = Number.parseFloat(outputEnd);
    const unit = outputEnd.replace(String(end), '');
    return `${start + (end - start) * clampedRatio}${unit}`;
  }

  return (outputStart as number) + ((outputEnd as number) - (outputStart as number)) * clampedRatio;
};

const AnimatedValue = vi.fn(function AnimatedValueMock(value: number) {
  return {
    setValue: vi.fn(function setValue() {}),
    interpolate: vi.fn(function interpolate(config: {
      inputRange: number[];
      outputRange: Array<number | string>;
    }) {
      return {
        __getValue: () => interpolateValue(value, config.inputRange, config.outputRange),
      };
    }),
    __getValue: () => value,
  };
});

const Animated = {
  Value: AnimatedValue,
  timing: vi.fn(function timing() {
    return {
      start: vi.fn(function start(cb?: any) {
        cb?.();
      }),
      stop: vi.fn(),
    };
  }),
  spring: vi.fn(function spring() {
    return {
      start: vi.fn(function start(cb?: any) {
        cb?.();
      }),
      stop: vi.fn(),
    };
  }),
  parallel: vi.fn(function parallel(animations: any[]) {
    return {
      start: vi.fn(function start(cb?: any) {
        animations.forEach(anim => anim.start?.());
        cb?.({ finished: true });
      }),
      stop: vi.fn(function stop() {
        animations.forEach(anim => anim.stop?.());
      }),
    };
  }),
  sequence: vi.fn(function sequence(animations: any[]) {
    return {
      start: vi.fn(function start(cb?: any) {
        animations.forEach(anim => anim.start?.());
        cb?.();
      }),
    };
  }),
  delay: vi.fn(function delay() {
    return {
      start: vi.fn(function start(cb?: any) {
        cb?.();
      }),
    };
  }),
  event: vi.fn(function event() {
    return vi.fn(function animatedEvent() {});
  }),
  createAnimatedComponent: vi.fn(function createAnimatedComponent(Component: any) {
    return Component;
  }),
  View: createNativeComponent('Animated.View'),
  Text: createNativeComponent('Animated.Text'),
};

const createSharedValue = (initialValue: any) => {
  let currentValue = initialValue;

  return {
    get value() {
      return currentValue;
    },
    set value(next) {
      currentValue = next && typeof next === 'object' && '__value' in next ? next.__value : next;
    },
    setValue(next: any) {
      currentValue = next;
    },
    get: () => currentValue,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    modify: vi.fn((modifier: (value: any) => any) => {
      currentValue = modifier(currentValue);
      return currentValue;
    }),
  };
};

const Reanimated = {
  View: createNativeComponent('Animated.View'),
  Text: createNativeComponent('Animated.Text'),
  ScrollView: createNativeComponent('Animated.ScrollView'),
  createAnimatedComponent: vi.fn(function createAnimatedComponent(Component: any) {
    const displayName = Component?.displayName ?? Component?.name ?? 'View';
    const nativeName = String(displayName).replace(/^Animated\./, '');

    return createNativeComponent(`Animated.${nativeName}`);
  }),
};

vi.mock('react-native-reanimated', () => {
  const useSharedValue = (initialValue: any) =>
    React.useMemo(() => createSharedValue(initialValue), []);
  const resolveAnimatedValue = (value: any) =>
    value && typeof value === 'object' && 'value' in value ? value.value : value;

  const withTiming = vi.fn(
    (toValue: any, _config?: any, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return { __value: toValue };
    }
  );

  const withDelay = vi.fn((_delay: number, animation: any) => ({
    __value:
      animation && typeof animation === 'object' && '__value' in animation
        ? animation.__value
        : animation,
  }));

  const withSequence = vi.fn((...animations: any[]) => {
    const last = animations[animations.length - 1];
    return {
      __value: last && typeof last === 'object' && '__value' in last ? last.__value : last,
    };
  });

  const withRepeat = vi.fn((animation: any, _numberOfReps?: number, _reverse?: boolean) => ({
    __value:
      animation && typeof animation === 'object' && '__value' in animation
        ? animation.__value
        : animation,
  }));

  const withSpring = vi.fn(
    (toValue: any, _config?: any, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return { __value: toValue };
    }
  );

  const createBuilder = (name: string) => {
    const builder: Record<string, any> = {
      __builder: name,
      __config: {},
    };

    builder.duration = vi.fn((value: number) => {
      builder.__config.duration = value;
      return builder;
    });
    builder.delay = vi.fn((value: number) => {
      builder.__config.delay = value;
      return builder;
    });
    builder.springify = vi.fn(() => {
      builder.__config.spring = true;
      return builder;
    });
    builder.damping = vi.fn((value: number) => {
      builder.__config.damping = value;
      return builder;
    });
    builder.stiffness = vi.fn((value: number) => {
      builder.__config.stiffness = value;
      return builder;
    });
    builder.mass = vi.fn((value: number) => {
      builder.__config.mass = value;
      return builder;
    });
    builder.reduceMotion = vi.fn((value: string) => {
      builder.__config.reduceMotion = value;
      return builder;
    });

    return builder;
  };

  const interpolateMock = vi.fn(
    (value: any, inputRange: number[], outputRange: Array<number | string>) =>
      interpolateValue(resolveAnimatedValue(value), inputRange, outputRange)
  );

  return {
    __esModule: true,
    default: Reanimated,
    Easing: {
      linear: vi.fn((value: number) => value),
    },
    Extrapolation: {
      CLAMP: 'clamp',
    },
    cancelAnimation: vi.fn(),
    interpolate: interpolateMock,
    makeMutable: vi.fn((value: any) => createSharedValue(value)),
    runOnJS:
      (fn: (...args: any[]) => any) =>
      (...args: any[]) =>
        fn(...args),
    useAnimatedReaction: vi.fn(
      (prepare: () => any, react?: (current: any, previous: any) => void) => {
        const current = prepare();
        react?.(current, undefined);
      }
    ),
    useAnimatedScrollHandler: vi.fn((handler: any) => {
      if (typeof handler === 'function') return (event: any) => handler(event);
      return (event: any) => handler?.onScroll?.(event);
    }),
    useAnimatedStyle: vi.fn((updater: () => Record<string, any>) => updater()),
    useDerivedValue: vi.fn((updater: () => any) => createSharedValue(updater())),
    useSharedValue,
    FadeIn: createBuilder('FadeIn'),
    FadeInDown: createBuilder('FadeInDown'),
    FadeInUp: createBuilder('FadeInUp'),
    FadeOut: createBuilder('FadeOut'),
    FadeOutDown: createBuilder('FadeOutDown'),
    FadeOutUp: createBuilder('FadeOutUp'),
    JumpingTransition: createBuilder('JumpingTransition'),
    Layout: createBuilder('Layout'),
    LinearTransition: createBuilder('LinearTransition'),
    SequencedTransition: createBuilder('SequencedTransition'),
    SlideInLeft: createBuilder('SlideInLeft'),
    SlideInRight: createBuilder('SlideInRight'),
    SlideOutLeft: createBuilder('SlideOutLeft'),
    SlideOutRight: createBuilder('SlideOutRight'),
    StretchInY: createBuilder('StretchInY'),
    StretchOutY: createBuilder('StretchOutY'),
    ZoomIn: createBuilder('ZoomIn'),
    ZoomOut: createBuilder('ZoomOut'),
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
  };
});

vi.mock('react-native', () => {
  const View = createNativeComponent('View');
  const Text = createNativeComponent('Text');
  const Pressable = createNativeComponent('Pressable');
  const TouchableOpacity = createNativeComponent('TouchableOpacity');
  const TouchableWithoutFeedback = createNativeComponent('TouchableWithoutFeedback');
  const ScrollView = createNativeComponent('ScrollView');
  const SafeAreaView = createNativeComponent('SafeAreaView');
  const ActivityIndicator = createNativeComponent('ActivityIndicator');
  const StatusBar = createNativeComponent('StatusBar');
  const TextInput = createNativeComponent('TextInput');
  const Image = createNativeComponent('Image');
  const Modal = createNativeComponent('Modal');
  const RefreshControl = createNativeComponent('RefreshControl');
  const Keyboard = { dismiss: vi.fn() };
  const PanResponder = {
    create: (config: any) => ({
      panHandlers: config,
    }),
  };
  const AccessibilityInfo = {
    isReduceMotionEnabled: vi.fn(async () => false),
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  };
  const BackHandler = {
    addEventListener: vi.fn((_eventName: string, handler: () => boolean) => ({
      remove: vi.fn(() => handler),
    })),
  };
  const FlatList = ({
    data = [],
    renderItem,
    keyExtractor,
    ListHeaderComponent,
    ListFooterComponent,
    ListEmptyComponent,
    testID,
    className,
    style,
  }: any) => {
    const renderMaybeComponent = (value: any) => {
      if (!value) return null;
      if (React.isValidElement(value)) return value;
      if (typeof value === 'function') return React.createElement(value);
      return null;
    };

    const content =
      Array.isArray(data) && data.length > 0
        ? data.map((item, index) => {
            const key = keyExtractor ? keyExtractor(item, index) : String(index);
            return React.createElement(
              React.Fragment,
              { key },
              renderItem ? renderItem({ item, index, separators: {} }) : null
            );
          })
        : renderMaybeComponent(ListEmptyComponent);

    return React.createElement(
      'FlatList',
      {
        className,
        style,
        'data-testid': testID,
      },
      renderMaybeComponent(ListHeaderComponent),
      content,
      renderMaybeComponent(ListFooterComponent)
    );
  };

  return {
    View,
    Text,
    Pressable,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    StatusBar,
    TextInput,
    Image,
    Modal,
    FlatList,
    RefreshControl,
    Keyboard,
    PanResponder,
    AccessibilityInfo,
    BackHandler,
    Animated,
    StyleSheet: {
      create: (styles: any) => styles,
      flatten: (styles: any) => styles,
      compose: (a: any, b: any) => [a, b],
      hairlineWidth: 1,
      absoluteFillObject: {},
    },
    Platform: {
      OS: 'ios',
      Version: '17',
      select: (config: Record<string, any>) => config.ios ?? config.default,
    },
    Dimensions: {
      get: () => ({ width: 390, height: 844, scale: 3, fontScale: 2 }),
      addEventListener: vi.fn(() => ({ remove: vi.fn() })),
      removeEventListener: vi.fn(),
    },
    I18nManager: {
      isRTL: false,
      allowRTL: vi.fn(),
      forceRTL: vi.fn(),
    },
    Appearance: {
      getColorScheme: () => 'light',
      addChangeListener: vi.fn(() => ({ remove: vi.fn() })),
    },
    useColorScheme: () => 'light',
    NativeModules: {},
    PixelRatio: {
      get: () => 3,
      roundToNearestPixel: (value: number) => value,
    },
  };
});

vi.mock('react-native-gesture-handler', () => {
  const createPanGesture = () => {
    const chain = {
      enabled: vi.fn(() => chain),
      activeOffsetX: vi.fn(() => chain),
      activeOffsetY: vi.fn(() => chain),
      onUpdate: vi.fn(() => chain),
      onEnd: vi.fn(() => chain),
      onFinalize: vi.fn(() => chain),
    };

    return chain;
  };

  return {
    GestureHandlerRootView: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('GestureHandlerRootView', props, children),
    GestureDetector: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Gesture: {
      Pan: vi.fn(() => createPanGesture()),
    },
  };
});

vi.mock('@expo/vector-icons', () => ({
  MaterialIcons: createNativeComponent('MaterialIcon'),
}));

vi.mock('expo-linear-gradient', () => ({
  LinearGradient: createNativeComponent('LinearGradient'),
}));

vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(() => Promise.resolve()),
  getItemAsync: vi.fn(() => Promise.resolve(null)),
  deleteItemAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useNavigation: () => ({
    navigate: vi.fn(),
    goBack: vi.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

vi.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children, ...props }: { children: React.ReactNode }) => {
      lastBottomTabNavigatorProps = props;
      return React.createElement(React.Fragment, null, children);
    },
    Screen: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }),
  __getLastBottomTabNavigatorProps: () => lastBottomTabNavigatorProps,
  __resetLastBottomTabNavigatorProps: () => {
    lastBottomTabNavigatorProps = null;
  },
}));

vi.mock('@react-navigation/drawer', () => ({
  createDrawerNavigator: () => createNavigator(),
}));

vi.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => {
    const Screen = (props: any) => {
      lastStackScreenProps.push(props);
      return React.createElement(React.Fragment, null, props.children);
    };
    Screen.displayName = 'Screen';

    const Group = ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children);
    Group.displayName = 'Group';

    const Navigator = ({ children, ...props }: { children: React.ReactNode }) => {
      React.Children.toArray(children).forEach(child => {
        if (!React.isValidElement(child)) {
          throw new Error(
            "A navigator can only contain 'Screen', 'Group' or 'React.Fragment' as its direct children"
          );
        }

        if (child.type !== Screen && child.type !== Group && child.type !== React.Fragment) {
          const childName =
            typeof child.type === 'string'
              ? child.type
              : ((child.type as any)?.displayName ?? (child.type as any)?.name);
          const screenName =
            child.props != null && typeof child.props === 'object' && 'name' in child.props
              ? child.props.name
              : undefined;
          throw new Error(
            `A navigator can only contain 'Screen', 'Group' or 'React.Fragment' as its direct children (found '${childName}'${screenName ? ` for the screen '${screenName}'` : ''})`
          );
        }
      });

      lastStackNavigatorProps = props;
      return React.createElement(React.Fragment, null, children);
    };
    Navigator.displayName = 'Navigator';

    return {
      Navigator,
      Screen,
      Group,
    };
  },
  TransitionPresets: {
    SlideFromRightIOS: {
      gestureDirection: 'horizontal',
      cardStyleInterpolator: 'forHorizontalIOS',
    },
  },
  __getLastStackNavigatorProps: () => lastStackNavigatorProps,
  __getLastStackScreenProps: () => lastStackScreenProps,
  __resetLastStackNavigatorProps: () => {
    lastStackNavigatorProps = null;
    lastStackScreenProps = [];
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  lastBottomTabNavigatorProps = null;
  lastStackNavigatorProps = null;
  lastStackScreenProps = [];
});
