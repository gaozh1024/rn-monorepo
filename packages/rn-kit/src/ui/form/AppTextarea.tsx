import { forwardRef } from 'react';
import type { TextInput } from 'react-native';
import { AppInput, type AppInputProps } from './AppInput';

export interface AppTextareaProps extends Omit<AppInputProps, 'textarea' | 'multiline'> {}

export const AppTextarea = forwardRef<TextInput, AppTextareaProps>(
  ({ minH, textareaMinHeight, blurOnSubmit, scrollEnabled, ...restProps }, ref) => {
    const props = { ...restProps } as AppTextareaProps & {
      textarea?: boolean;
      multiline?: boolean;
    };
    delete props.textarea;
    delete props.multiline;

    return (
      <AppInput
        ref={ref}
        {...props}
        minH={minH ?? textareaMinHeight ?? 96}
        textareaMinHeight={textareaMinHeight}
        blurOnSubmit={blurOnSubmit ?? false}
        scrollEnabled={scrollEnabled ?? false}
        textarea
      />
    );
  }
);

AppTextarea.displayName = 'AppTextarea';
