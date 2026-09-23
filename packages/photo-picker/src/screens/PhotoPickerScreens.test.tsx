import { act } from 'react';
import { create, type ReactTestRenderer } from 'react-test-renderer';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { CropZoom } from 'react-native-zoom-toolkit';
import { manipulateAsync } from 'expo-image-manipulator';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  clearPhotoAlbumCompleteCallback,
  getPhotoAlbumCompleteCallback,
  registerPhotoAlbumCompleteCallback,
} from '../internal/photoPickerCallbackRegistry';
import { pickMedia, releaseMedia } from '../native';
import type { PhotoAlbumItem, PhotoPickerResult } from '../types';
import { PhotoAlbumScreen } from './PhotoAlbumScreen';
import { PhotoCropScreen } from './PhotoCropScreen';

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles, absoluteFillObject: {} },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
}));

vi.mock('../native', () => ({
  pickMedia: vi.fn(),
  releaseMedia: vi.fn(),
}));

vi.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
vi.mock('react-native-zoom-toolkit', async () => {
  const React = await import('react');
  const CropZoom = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({
      crop: () => ({ crop: { originX: 0, originY: 0, width: 100, height: 100 } }),
    }));
    return React.createElement('CropZoom');
  });
  return { CropZoom };
});
vi.mock('expo-image', () => ({ Image: 'Image' }));
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: vi.fn(),
}));
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const video: PhotoAlbumItem = {
  id: 'video',
  uri: 'file:///video.mp4',
  mediaType: 'video',
  width: 1920,
  height: 1080,
  duration: 61,
};
const photo: PhotoAlbumItem = {
  id: 'photo',
  uri: 'file:///photo.jpg',
  mediaType: 'photo',
  width: 1200,
  height: 900,
};

let tree: ReactTestRenderer | undefined;
let callbackId: string;
let onComplete: Mock<(assets: PhotoAlbumItem[]) => void>;
let navigation: { goBack: Mock<() => void>; navigate: Mock<() => void>; pop: Mock<() => void> };
let frames: FrameRequestCallback[];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => frames.push(callback))
  );
  vi.mocked(releaseMedia).mockResolvedValue(undefined);
  onComplete = vi.fn();
  callbackId = registerPhotoAlbumCompleteCallback(onComplete);
  navigation = { goBack: vi.fn(), navigate: vi.fn(), pop: vi.fn() };
});

afterEach(async () => {
  await act(async () => tree?.unmount());
  tree = undefined;
  clearPhotoAlbumCompleteCallback(callbackId);
  vi.unstubAllGlobals();
});

async function renderAlbum() {
  await act(async () => {
    tree = create(
      <PhotoAlbumScreen
        route={{ params: { callbackId, options: { maxVideoDuration: 60 } } }}
        navigation={navigation}
      />
    );
  });
}

function texts() {
  return tree!.root.findAllByType(Text).map(node => node.props.children);
}

async function press(label: string) {
  const button = tree!.root
    .findAllByType(Pressable)
    .find(node => node.findAllByType(Text).some(text => text.props.children === label));
  expect(button).toBeDefined();
  await act(async () => button!.props.onPress());
}

function expectRetainedError() {
  expect(texts()).toContain('重试');
  expect(texts()).toContain('取消');
  expect(tree!.root.findAllByType(ActivityIndicator)).toHaveLength(0);
  expect(onComplete).not.toHaveBeenCalled();
  expect(navigation.goBack).not.toHaveBeenCalled();
  expect(navigation.navigate).not.toHaveBeenCalled();
  expect(getPhotoAlbumCompleteCallback(callbackId)).toBe(onComplete);
}

describe('PhotoAlbumScreen', () => {
  it('超时长后保留回调，重试时恢复 spinner，选择合规视频后完成', async () => {
    let resolveRetry!: (result: PhotoPickerResult) => void;
    vi.mocked(pickMedia)
      .mockResolvedValueOnce({ cancelled: false, assets: [video] })
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveRetry = resolve;
          })
      );

    await renderAlbum();

    expectRetainedError();
    expect(texts()).toContain('视频时长不能超过 60 秒');
    expect(releaseMedia).toHaveBeenCalledWith([video.uri]);
    expect(pickMedia).toHaveBeenCalledTimes(1);

    await press('重试');

    expect(pickMedia).toHaveBeenCalledTimes(2);
    expect(tree!.root.findAllByType(ActivityIndicator)).toHaveLength(1);
    expect(texts()).not.toContain('重试');
    expect(texts()).not.toContain('视频时长不能超过 60 秒');
    const acceptedVideo = { ...video, duration: 60 };
    await act(async () => resolveRetry({ cancelled: false, assets: [acceptedVideo] }));

    expect(onComplete).toHaveBeenCalledExactlyOnceWith([acceptedVideo]);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
  });

  it('超时长后点击取消清理回调并退出，不重新打开选择器', async () => {
    vi.mocked(pickMedia).mockResolvedValue({ cancelled: false, assets: [video] });
    await renderAlbum();
    expectRetainedError();

    await press('取消');

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
    expect(onComplete).not.toHaveBeenCalled();
    expect(pickMedia).toHaveBeenCalledTimes(1);
  });

  it('重试后取消系统选择器会清理回调并退出', async () => {
    vi.mocked(pickMedia)
      .mockResolvedValueOnce({ cancelled: false, assets: [video] })
      .mockResolvedValueOnce({ cancelled: true, assets: [] });
    await renderAlbum();
    await press('重试');

    expect(pickMedia).toHaveBeenCalledTimes(2);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
  });

  it('释放超时长资源失败仍显示可重试错误', async () => {
    vi.mocked(pickMedia).mockResolvedValue({ cancelled: false, assets: [video] });
    vi.mocked(releaseMedia).mockRejectedValue(new Error('release failed'));
    await renderAlbum();

    expectRetainedError();
    expect(texts()).toContain('视频时长不能超过 60 秒');
  });

  it('打开选择器失败隐藏 spinner，重试成功后完成', async () => {
    vi.mocked(pickMedia)
      .mockRejectedValueOnce(new Error('picker failed'))
      .mockResolvedValueOnce({ cancelled: false, assets: [photo] });
    await renderAlbum();

    expectRetainedError();
    expect(texts()).toContain('picker failed');
    await press('重试');

    expect(onComplete).toHaveBeenCalledExactlyOnceWith([photo]);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
  });
});

describe('PhotoCropScreen', () => {
  it.each([true, false])('取消先卸载裁剪内容，再退出流程，支持 pop=%s', async hasPop => {
    const cropNavigation = hasPop ? navigation : { goBack: navigation.goBack };
    await act(async () => {
      tree = create(
        <PhotoCropScreen route={{ params: { photo, callbackId } }} navigation={cropNavigation} />
      );
    });
    expect(tree!.root.findAllByType(CropZoom)).toHaveLength(1);

    await press('×');

    expect(tree!.root.findAllByType(CropZoom)).toHaveLength(0);
    expect(releaseMedia).toHaveBeenCalledExactlyOnceWith([photo.uri]);
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
    expect(onComplete).not.toHaveBeenCalled();
    expect(manipulateAsync).not.toHaveBeenCalled();
    expect(navigation.pop).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);
    await press('×');
    expect(frames).toHaveLength(1);
    expect(releaseMedia).toHaveBeenCalledExactlyOnceWith([photo.uri]);
    await act(async () => {
      frames[0]!(0);
    });

    if (hasPop) {
      expect(navigation.pop).toHaveBeenCalledExactlyOnceWith(2);
      expect(navigation.goBack).not.toHaveBeenCalled();
    } else {
      expect(navigation.goBack).toHaveBeenCalledTimes(1);
    }
  });

  it('完成后释放原始资源并在卸载时避免重复清理', async () => {
    vi.mocked(manipulateAsync).mockResolvedValue({
      uri: 'file:///cropped.jpg',
      width: 100,
      height: 100,
    });
    await act(async () => {
      tree = create(
        <PhotoCropScreen
          route={{
            params: {
              photo: {
                ...photo,
                localUri: 'file:///local-photo.jpg',
                originalUri: 'content://original',
              },
              callbackId,
            },
          }}
          navigation={navigation}
        />
      );
    });

    await press('完成');

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(releaseMedia).toHaveBeenCalledExactlyOnceWith([
      photo.uri,
      'file:///local-photo.jpg',
      'content://original',
    ]);
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
    expect(frames).toHaveLength(1);
    await act(async () => tree?.unmount());
    expect(releaseMedia).toHaveBeenCalledTimes(1);
  });

  it('裁剪异常时释放原始资源和未交付输出并清理回调', async () => {
    vi.mocked(manipulateAsync).mockResolvedValue({
      uri: 'file:///cropped.jpg',
      width: 100,
      height: 100,
    });
    onComplete.mockImplementation(() => {
      throw new Error('callback failed');
    });
    await act(async () => {
      tree = create(
        <PhotoCropScreen route={{ params: { photo, callbackId } }} navigation={navigation} />
      );
    });

    await press('完成');

    expect(releaseMedia).toHaveBeenCalledWith([photo.uri]);
    expect(releaseMedia).toHaveBeenCalledWith(['file:///cropped.jpg']);
    expect(releaseMedia).toHaveBeenCalledTimes(2);
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('取消后异步返回的裁剪输出会被释放且不会回调', async () => {
    let resolveManipulate!: (result: { uri: string; width: number; height: number }) => void;
    vi.mocked(manipulateAsync).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveManipulate = resolve;
        })
    );
    await act(async () => {
      tree = create(
        <PhotoCropScreen route={{ params: { photo, callbackId } }} navigation={navigation} />
      );
    });

    const confirmButton = tree!.root
      .findAllByType(Pressable)
      .find(node => node.findAllByType(Text).some(text => text.props.children === '完成'));
    expect(confirmButton).toBeDefined();
    confirmButton!.props.onPress();
    await act(async () => undefined);
    await press('×');
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();

    await act(async () => {
      resolveManipulate({ uri: 'file:///late-cropped.jpg', width: 100, height: 100 });
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(releaseMedia).toHaveBeenCalledWith(['file:///late-cropped.jpg']);
    expect(releaseMedia).toHaveBeenCalledTimes(2);
  });

  it('卸载后异步返回的裁剪输出会被释放', async () => {
    let resolveManipulate!: (result: { uri: string; width: number; height: number }) => void;
    vi.mocked(manipulateAsync).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveManipulate = resolve;
        })
    );
    await act(async () => {
      tree = create(
        <PhotoCropScreen route={{ params: { photo, callbackId } }} navigation={navigation} />
      );
    });

    const confirmButton = tree!.root
      .findAllByType(Pressable)
      .find(node => node.findAllByType(Text).some(text => text.props.children === '完成'));
    expect(confirmButton).toBeDefined();
    confirmButton!.props.onPress();
    await act(async () => undefined);
    await act(async () => tree?.unmount());
    await act(async () => {
      resolveManipulate({ uri: 'file:///unmounted-cropped.jpg', width: 100, height: 100 });
    });

    expect(onComplete).not.toHaveBeenCalled();
    expect(releaseMedia).toHaveBeenCalledWith(['file:///unmounted-cropped.jpg']);
    expect(releaseMedia).toHaveBeenCalledTimes(2);
  });

  it('卸载时释放原始资源并清理回调', async () => {
    await act(async () => {
      tree = create(
        <PhotoCropScreen route={{ params: { photo, callbackId } }} navigation={navigation} />
      );
    });

    await act(async () => tree?.unmount());

    expect(releaseMedia).toHaveBeenCalledExactlyOnceWith([photo.uri]);
    expect(getPhotoAlbumCompleteCallback(callbackId)).toBeUndefined();
  });

  it('从相册导航裁剪时传递合并后的文案', async () => {
    vi.mocked(pickMedia).mockResolvedValue({ cancelled: false, assets: [photo] });
    await act(async () => {
      tree = create(
        <PhotoAlbumScreen
          route={{
            params: {
              callbackId,
              uiConfig: { texts: { cropTitle: '路由裁剪', cropConfirmButton: '路由完成' } },
              options: {
                crop: { shape: 'circle' },
                uiConfig: { texts: { cropConfirmButton: '选项完成', cropCircleHint: '选项提示' } },
              },
            },
          }}
          navigation={navigation}
        />
      );
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        uiConfig: {
          texts: expect.objectContaining({
            cropTitle: '路由裁剪',
            cropConfirmButton: '选项完成',
            cropCircleHint: '选项提示',
          }),
        },
      })
    );
  });
});
