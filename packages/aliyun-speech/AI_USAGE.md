# @gaozh1024/aliyun-speech AI Usage

## What It Is

Aliyun real-time speech-to-text package with protocol core, headless hook, and optional default UI for Expo or React Native apps.

## When To Use

- Use this package when the app needs Aliyun real-time speech-to-text input for chat, dictation, or voice command flows.
- Prefer the headless hook when the business flow needs custom UI or state control.
- Use the default VoiceToTextInput only when its built-in interaction model matches the product need.

## When Not To Use

- Do not use this package if the app does not need Aliyun speech recognition specifically.
- Do not treat the default UI component as mandatory; the package is designed headless-first.
- Do not put long-lived production tokens or app secrets directly in client source code.

## Recommended Entry

- Initialize the package once near app startup with initializeAliyunSpeech.
- Prefer useAliyunVoiceToText for custom business flows.
- Use VoiceToTextInput as an optional convenience component rather than the default integration path for every screen.

## Install Prerequisites

- Install command: pnpm add @gaozh1024/aliyun-speech
- Peer dependencies: @siteed/audio-studio, expo, expo-audio, react, react-native

## Required Project Setup

- Install @siteed/audio-studio and expo-audio alongside this package.
- Configure microphone permission and @siteed/audio-studio plugin settings in Expo app.json or app.config.ts.
- Provide token refresh from the server side instead of relying on a static client token.

## Minimal Working Example

- speech-hook-surface: packages/aliyun-speech/src/hooks.ts
- speech-default-ui: packages/aliyun-speech/src/components/VoiceToTextInput.tsx

## Canonical Patterns

- Prefer the stable public API `initializeAliyunSpeech` when it matches the use case.
- Prefer the stable public API `refreshAliyunSpeechTokenIfNeeded` when it matches the use case.
- Prefer the stable public API `AliyunSpeechTranscriber` when it matches the use case.
- Prefer the stable public API `useAliyunVoiceToText` when it matches the use case.
- Prefer the stable public API `VoiceToTextInput` when it matches the use case.
- Prefer the stable public API `ensureMicrophonePermission` when it matches the use case.

## Anti-Patterns

- Hard-coding a production Aliyun token or appKey in client code.
- Skipping microphone permission configuration and expecting runtime recording to work.
- Using the package UI component when the app actually needs a fully custom voice input flow.

## Common Failure Cases

- Speech recognition does not start because microphone permission or audio plugin config is missing.
- Voice connection fails because token refresh was not configured or token state is stale.
- Integration assumptions break in non-Expo environments because the default recorder path is Expo-oriented.

## Compatibility Baseline

- The default recorder implementation is based on @siteed/audio-studio and expo-audio.
- Current package peer dependencies target Expo >=54 <56 and React Native >=0.81 <0.84.
- Use the host Expo SDK's expo-audio version from expo install.
- The package is designed with a headless-first boundary: protocol core, hook, then optional UI.

## See Also

- README.md
- AI_USAGE.md
