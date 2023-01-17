/// <reference types="node" />
import { DataSource, DataSourceConfig } from 'apollo-datasource';
import { Pool } from 'undici';
import Dispatcher from 'undici/types/dispatcher';
import { EventEmitter } from 'stream';
import { Logger } from 'apollo-server-types';
type AbortSignal = unknown;
export declare class RequestError<T = unknown> extends Error {
    message: string;
    code: number;
    request: Request;
    response: Response<T>;
    constructor(message: string, code: number, request: Request, response: Response<T>);
}
export type CacheTTLOptions = {
    requestCache?: {
        maxTtl: number;
        maxTtlIfError: number;
    };
};
interface Dictionary<T> {
    [Key: string]: T | undefined;
}
export type RequestOptions<BaseURLContext> = Omit<Partial<Request>, 'origin' | 'path' | 'method'> & {
    baseUrlContext?: BaseURLContext;
};
export type Request<T = unknown, BaseURLContext = unknown> = {
    context: Dictionary<string>;
    query: Dictionary<string | number>;
    body: T;
    signal?: AbortSignal | EventEmitter | null;
    json?: boolean;
    origin: string;
    path: string;
    method: Dispatcher.HttpMethod;
    memoize?: boolean;
    headers: Dictionary<string>;
    baseUrlContext?: BaseURLContext;
} & CacheTTLOptions;
export type Response<TResult> = {
    body: TResult;
    memoized: boolean;
    isFromCache: boolean;
    maxTtl?: number;
} & Omit<Dispatcher.ResponseData, 'body'>;
export interface LRUOptions {
    readonly maxAge?: number;
    readonly maxSize: number;
}
export interface HTTPDataSourceOptions<BaseURLContext> {
    logger?: Logger;
    pool?: Pool;
    requestOptions?: RequestOptions<BaseURLContext>;
    clientOptions?: Pool.Options;
    lru?: Partial<LRUOptions>;
}
export declare abstract class HTTPDataSource<BaseURLContext = any, TContext = any> extends DataSource {
    readonly baseURL: string | ((opts?: BaseURLContext) => Promise<string>) | ((opts?: BaseURLContext) => string);
    private readonly options?;
    context: TContext;
    private logger?;
    private cache;
    private globalRequestOptions?;
    private pools;
    private readonly memoizedResults;
    constructor(baseURL: string | ((opts?: BaseURLContext) => Promise<string>) | ((opts?: BaseURLContext) => string), options?: HTTPDataSourceOptions<BaseURLContext> | undefined);
    getPool(opts?: BaseURLContext): Promise<Pool>;
    getBaseUrl(opts?: BaseURLContext): Promise<string>;
    private buildQueryString;
    initialize(config: DataSourceConfig<TContext>): void;
    protected isResponseOk(statusCode: number): boolean;
    protected isResponseCacheable<TResult = unknown>(request: Request, response: Response<TResult>): boolean;
    protected isRequestCacheable(request: Request): boolean;
    protected isRequestMemoizable(request: Request): boolean;
    protected onCacheKeyCalculation(request: Request): string;
    protected onRequest?(request: Request): Promise<void>;
    protected onResponse<TResult = unknown>(request: Request, response: Response<TResult>): Response<TResult>;
    protected onError?(_error: Error, requestOptions: Request): void;
    get<TResult = unknown>(path: string, requestOptions?: RequestOptions<BaseURLContext>): Promise<Response<TResult>>;
    post<TResult = unknown>(path: string, requestOptions?: RequestOptions<BaseURLContext>): Promise<Response<TResult>>;
    delete<TResult = unknown>(path: string, requestOptions?: RequestOptions<BaseURLContext>): Promise<Response<TResult>>;
    put<TResult = unknown>(path: string, requestOptions?: RequestOptions<BaseURLContext>): Promise<Response<TResult>>;
    patch<TResult = unknown>(path: string, requestOptions?: RequestOptions<BaseURLContext>): Promise<Response<TResult>>;
    private performRequest;
    private request;
}
export {};
//# sourceMappingURL=http-data-source.d.ts.map