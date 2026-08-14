import { describe, expect, it } from 'vitest';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { ThemeProvider, createTheme } from '@/theme';
import { Picker } from '../../form/Picker';
import { Select } from '../../form/Select';
import { DatePicker } from '../../form/DatePicker';
import { AppPressable } from '../../primitives/AppPressable';

const theme = createTheme({
  colors: { primary: '#f38b32' },
});

describe('form press motion props', () => {
  it('Select 应该透传触发器按压动画配置', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Select
            placeholder="选择城市"
            options={[{ label: '北京', value: 'beijing' }]}
            motionPreset="strong"
            motionDuration={230}
            motionReduceMotion
          />
        </ThemeProvider>
      );
    });

    const trigger = renderer!.root.findAllByType(AppPressable)[0];

    expect(trigger.props).toMatchObject({
      motionPreset: 'strong',
      motionDuration: 230,
      motionReduceMotion: true,
    });
  });

  it('Picker 应该透传触发器按压动画配置', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            placeholder="打开地区选择"
            columns={[
              {
                key: 'province',
                options: [{ label: '广东省', value: 'gd' }],
              },
            ]}
            motionPreset="strong"
            motionDuration={260}
            motionReduceMotion
          />
        </ThemeProvider>
      );
    });

    const trigger = renderer!.root.findAllByType(AppPressable)[0];

    expect(trigger.props).toMatchObject({
      motionPreset: 'strong',
      motionDuration: 260,
      motionReduceMotion: true,
    });
  });

  it('Picker 默认不启用触发器按压动画', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <Picker
            placeholder="打开地区选择"
            columns={[
              {
                key: 'province',
                options: [{ label: '广东省', value: 'gd' }],
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    const trigger = renderer!.root.findAllByType(AppPressable)[0];

    expect(trigger.props.motionPreset).toBe('none');
  });

  it('DatePicker 应该透传按压动画配置给内部 Picker', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <DatePicker motionPreset="strong" motionDuration={280} motionReduceMotion />
        </ThemeProvider>
      );
    });

    const picker = renderer!.root.findByType(Picker);

    expect(picker.props).toMatchObject({
      motionPreset: 'strong',
      motionDuration: 280,
      motionReduceMotion: true,
    });
  });

  it('DatePicker 默认不启用内部 Picker 按压动画', () => {
    let renderer: ReturnType<typeof create>;

    act(() => {
      renderer = create(
        <ThemeProvider light={theme}>
          <DatePicker />
        </ThemeProvider>
      );
    });

    const picker = renderer!.root.findByType(Picker);

    expect(picker.props.motionPreset).toBe('none');
  });
});
