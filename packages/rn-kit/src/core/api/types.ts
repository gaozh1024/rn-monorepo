/**
 * @fileoverview API 类型定义模块
 * @module core/api/types
 * @description 定义 API 端点和配置的核心类型接口
 */

import { z } from 'zod';
import type { AppError } from '../error';
import type { LoggerLike } from '../logger';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ApiErrorContext {
  /** 当前调用的 endpoint 名称 */
  endpointName: string;
  /** 当前 endpoint 的 path */
  path: string;
  /** HTTP 方法 */
  method: ApiMethod;
  /** 调用入参 */
  input?: unknown;
  /** 原始响应对象 */
  response?: Response;
  /** 已解析的响应数据 */
  responseData?: unknown;
}

export type ApiErrorHandler = (error: AppError, context: ApiErrorContext) => void | Promise<void>;

export type ApiBusinessErrorParser = (data: unknown, response: Response) => AppError | null;

export interface ApiRequestContext {
  /** 当前调用的 endpoint 名称 */
  endpointName: string;
  /** 当前 endpoint 的原始 path */
  path: string;
  /** HTTP 方法 */
  method: ApiMethod;
  /** 调用入参 */
  input?: unknown;
  /** 解析后的请求 URL */
  url: string;
}

export type ApiHeadersResolver = (
  context: ApiRequestContext
) => HeadersInit | undefined | Promise<HeadersInit | undefined>;

export type ApiLogStage = 'request' | 'response' | 'error';

export interface ApiLogEvent {
  stage: ApiLogStage;
  endpointName: string;
  path: string;
  method: ApiMethod;
  url: string;
  input?: unknown;
  response?: Response;
  responseData?: unknown;
  statusCode?: number;
  durationMs?: number;
  error?: AppError;
}

export type ApiLogTransport = (event: ApiLogEvent) => void | Promise<void>;

export type ApiStreamProtocol = 'raw' | 'sse';

export type ApiStreamFetcher = (url: string, init?: RequestInit) => Promise<Response>;

export interface ApiStreamRequestOptions {
  method?: ApiMethod;
  headers?: HeadersInit;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  protocol?: ApiStreamProtocol;
  fetcher?: ApiStreamFetcher;
}

export interface ApiStreamResponse {
  stream: ReadableStream<Uint8Array>;
  abort: () => void;
  response: Response;
}

export interface ApiSSEMessage<T = unknown> {
  event: string;
  data: T | string;
  rawData: string;
}

export interface ApiSSEReaderOptions<T = unknown> {
  onEvent?: (message: ApiSSEMessage<T>) => void;
  onMessage?: (event: string, data: string, message: ApiSSEMessage<T>) => void;
  onError?: (error: unknown) => void;
  onDone?: () => void;
  parseJson?: boolean;
}

export interface ApiObservabilityConfig {
  enabled?: boolean;
  transports?: ApiLogTransport[];
  logger?: LoggerLike | null;
  namespace?: string;
  includeInput?: boolean;
  includeResponseData?: boolean;
  sanitize?: (
    value: unknown,
    meta: { stage: ApiLogStage; field: 'input' | 'responseData' | 'error' }
  ) => unknown;
}

/**
 * API 端点配置接口
 * @template TInput - 请求输入数据的类型
 * @template TOutput - 响应输出数据的类型
 * @example
 * ```typescript
 * const userEndpoint: ApiEndpointConfig<{ id: number }, User> = {
 *   method: 'GET',
 *   path: '/users/:id',
 *   input: z.object({ id: z.number() }),
 *   output: z.instanceof(User)
 * };
 * ```
 */
export interface ApiEndpointConfig<TInput, TOutput> {
  /** HTTP 请求方法 */
  method: ApiMethod;
  /** API 路径（相对于 baseURL） */
  path: string;
  /** 当前 endpoint 的默认请求头（可选） */
  headers?: HeadersInit;
  /** 当前 endpoint 的动态请求头解析器（可选） */
  getHeaders?: ApiHeadersResolver;
  /** 请求数据的 Zod 校验模式（可选） */
  input?: z.ZodSchema<TInput>;
  /** 响应数据的 Zod 校验模式（可选） */
  output?: z.ZodSchema<TOutput>;
  /** 当前 endpoint 的业务错误解析器（可选） */
  parseBusinessError?: ApiBusinessErrorParser;
  /** 当前 endpoint 的错误监听器（可选） */
  onError?: ApiErrorHandler;
}

/**
 * API 配置接口
 * @template TEndpoints - 端点配置映射类型
 * @example
 * ```typescript
 * const config: ApiConfig<typeof myEndpoints> = {
 *   baseURL: 'https://api.example.com/v1',
 *   endpoints: {
 *     getUser: { method: 'GET', path: '/users/:id' },
 *     createUser: { method: 'POST', path: '/users' }
 *   }
 * };
 * ```
 */
export interface ApiConfig<TEndpoints extends Record<string, ApiEndpointConfig<any, any>>> {
  /** API 基础 URL */
  baseURL: string;
  /** 端点配置映射 */
  endpoints: TEndpoints;
  /** 全局默认请求头（可选） */
  headers?: HeadersInit;
  /** 全局动态请求头解析器（可选） */
  getHeaders?: ApiHeadersResolver;
  /** 自定义 fetch 实现（可选） */
  fetcher?: typeof fetch;
  /** 全局业务错误解析器（可选） */
  parseBusinessError?: ApiBusinessErrorParser;
  /** 全局错误监听器（可选） */
  onError?: ApiErrorHandler;
  /** 开发可观测性配置（可选） */
  observability?: ApiObservabilityConfig;
}
