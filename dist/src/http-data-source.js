"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTPDataSource = exports.RequestError = void 0;
const apollo_datasource_1 = require("apollo-datasource");
const undici_1 = require("undici");
const http_1 = require("http");
const quick_lru_1 = __importDefault(require("@alloc/quick-lru"));
const zlib_1 = require("zlib");
const stream_to_promise_1 = __importDefault(require("stream-to-promise"));
const apollo_server_errors_1 = require("apollo-server-errors");
const url_1 = require("url");
class RequestError extends Error {
    constructor(message, code, request, response) {
        super(message);
        this.message = message;
        this.code = code;
        this.request = request;
        this.response = response;
        this.name = 'RequestError';
    }
}
exports.RequestError = RequestError;
const statusCodeCacheableByDefault = new Set([200, 203]);
class HTTPDataSource extends apollo_datasource_1.DataSource {
    constructor(baseURL, options) {
        var _a, _b, _c, _d;
        super();
        this.baseURL = baseURL;
        this.options = options;
        this.pools = new Map();
        this.memoizedResults = new quick_lru_1.default({
            maxSize: ((_b = (_a = this.options) === null || _a === void 0 ? void 0 : _a.lru) === null || _b === void 0 ? void 0 : _b.maxSize) ? this.options.lru.maxSize : 100,
            maxAge: (_d = (_c = this.options) === null || _c === void 0 ? void 0 : _c.lru) === null || _d === void 0 ? void 0 : _d.maxAge,
        });
        this.globalRequestOptions = options === null || options === void 0 ? void 0 : options.requestOptions;
        this.logger = options === null || options === void 0 ? void 0 : options.logger;
    }
    async getPool() {
        var _a, _b, _c;
        if ((_a = this.options) === null || _a === void 0 ? void 0 : _a.pool) {
            return (_b = this.options) === null || _b === void 0 ? void 0 : _b.pool;
        }
        const baseUrl = await this.getBaseUrl();
        if (this.pools.has(baseUrl)) {
            return this.pools.get(baseUrl);
        }
        const pool = new undici_1.Pool(baseUrl, (_c = this.options) === null || _c === void 0 ? void 0 : _c.clientOptions);
        this.pools.set(baseUrl, pool);
        return pool;
    }
    getBaseUrl() {
        if (typeof this.baseURL === 'string') {
            return Promise.resolve(this.baseURL);
        }
        return Promise.resolve(this.baseURL());
    }
    buildQueryString(query) {
        const params = new url_1.URLSearchParams();
        for (const key in query) {
            if (Object.prototype.hasOwnProperty.call(query, key)) {
                const value = query[key];
                if (value !== undefined) {
                    params.append(key, value.toString());
                }
            }
        }
        params.sort();
        return params.toString();
    }
    initialize(config) {
        this.context = config.context;
        this.cache = config.cache;
    }
    isResponseOk(statusCode) {
        return statusCode >= 200 && statusCode <= 399;
    }
    isResponseCacheable(request, response) {
        return statusCodeCacheableByDefault.has(response.statusCode) && this.isRequestCacheable(request);
    }
    isRequestCacheable(request) {
        return request.method === 'GET';
    }
    isRequestMemoizable(request) {
        return Boolean(request.memoize) && request.method === 'GET';
    }
    onCacheKeyCalculation(request) {
        return request.origin + request.path;
    }
    onResponse(request, response) {
        if (this.isResponseOk(response.statusCode)) {
            return response;
        }
        throw new RequestError(`Response code ${response.statusCode} (${http_1.STATUS_CODES[response.statusCode.toString()]})`, response.statusCode, request, response);
    }
    async get(path, requestOptions) {
        return this.request({
            headers: {},
            query: {},
            body: null,
            memoize: true,
            context: {},
            ...requestOptions,
            method: 'GET',
            path,
            origin: await this.getBaseUrl(),
        });
    }
    async post(path, requestOptions) {
        return this.request({
            headers: {},
            query: {},
            body: null,
            context: {},
            ...requestOptions,
            method: 'POST',
            path,
            origin: await this.getBaseUrl(),
        });
    }
    async delete(path, requestOptions) {
        return this.request({
            headers: {},
            query: {},
            body: null,
            context: {},
            ...requestOptions,
            method: 'DELETE',
            path,
            origin: await this.getBaseUrl(),
        });
    }
    async put(path, requestOptions) {
        return this.request({
            headers: {},
            query: {},
            body: null,
            context: {},
            ...requestOptions,
            method: 'PUT',
            path,
            origin: await this.getBaseUrl(),
        });
    }
    async patch(path, requestOptions) {
        return this.request({
            headers: {},
            query: {},
            body: null,
            context: {},
            ...requestOptions,
            method: 'PATCH',
            path,
            origin: await this.getBaseUrl(),
        });
    }
    async performRequest(request, cacheKey) {
        var _a, _b, _c;
        try {
            if (request.body !== null && typeof request.body === 'object') {
                if (request.headers['content-type'] === undefined) {
                    request.headers['content-type'] = 'application/json; charset=utf-8';
                }
                request.body = JSON.stringify(request.body);
            }
            await ((_a = this.onRequest) === null || _a === void 0 ? void 0 : _a.call(this, request));
            const requestOptions = {
                method: request.method,
                origin: request.origin,
                path: request.path,
                headers: request.headers,
                signal: request.signal,
                body: request.body,
            };
            const pool = await this.getPool();
            const responseData = await pool.request(requestOptions);
            const body = responseData.body;
            const headers = responseData.headers;
            let dataBuffer;
            switch (headers['content-encoding']) {
                case 'br':
                    dataBuffer = await (0, stream_to_promise_1.default)(body.pipe((0, zlib_1.createBrotliDecompress)()));
                    break;
                case 'gzip':
                case 'deflate':
                    dataBuffer = await (0, stream_to_promise_1.default)(body.pipe((0, zlib_1.createUnzip)()));
                    break;
                default:
                    dataBuffer = await (0, stream_to_promise_1.default)(body);
                    break;
            }
            let data = dataBuffer.toString('utf-8');
            if (((_b = responseData.headers['content-type']) === null || _b === void 0 ? void 0 : _b.includes('application/json')) &&
                data.length &&
                typeof data === 'string') {
                data = JSON.parse(data);
            }
            const response = {
                isFromCache: false,
                memoized: false,
                ...responseData,
                body: data,
            };
            this.onResponse(request, response);
            if (this.isRequestMemoizable(request)) {
                this.memoizedResults.set(cacheKey, response);
            }
            if (request.requestCache && this.isResponseCacheable(request, response)) {
                response.maxTtl = request.requestCache.maxTtl;
                const cachedResponse = JSON.stringify(response);
                this.cache
                    .set(cacheKey, cachedResponse, {
                    ttl: request.requestCache.maxTtl,
                })
                    .catch((err) => { var _a; return (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error(err); });
                this.cache
                    .set(`staleIfError:${cacheKey}`, cachedResponse, {
                    ttl: request.requestCache.maxTtl + request.requestCache.maxTtlIfError,
                })
                    .catch((err) => { var _a; return (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error(err); });
            }
            return response;
        }
        catch (error) {
            (_c = this.onError) === null || _c === void 0 ? void 0 : _c.call(this, error, request);
            if (request.requestCache) {
                const cacheItem = await this.cache.get(`staleIfError:${cacheKey}`);
                if (cacheItem) {
                    const response = JSON.parse(cacheItem);
                    response.isFromCache = true;
                    return response;
                }
            }
            throw (0, apollo_server_errors_1.toApolloError)(error);
        }
    }
    async request(request) {
        var _a, _b;
        if (Object.keys(request.query).length > 0) {
            request.path = request.path + '?' + this.buildQueryString(request.query);
        }
        const cacheKey = this.onCacheKeyCalculation(request);
        const isRequestMemoizable = this.isRequestMemoizable(request);
        if (isRequestMemoizable) {
            if (this.memoizedResults.has(cacheKey)) {
                const response = await this.memoizedResults.get(cacheKey);
                response.memoized = true;
                response.isFromCache = false;
                return response;
            }
        }
        const headers = {
            ...(((_a = this.globalRequestOptions) === null || _a === void 0 ? void 0 : _a.headers) || {}),
            ...request.headers,
        };
        const options = {
            ...request,
            ...this.globalRequestOptions,
            headers,
        };
        const requestIsCacheable = this.isRequestCacheable(request);
        if (requestIsCacheable) {
            if (request.requestCache) {
                try {
                    const cacheItem = await this.cache.get(cacheKey);
                    if (cacheItem) {
                        const cachedResponse = JSON.parse(cacheItem);
                        cachedResponse.memoized = false;
                        cachedResponse.isFromCache = true;
                        return cachedResponse;
                    }
                    const response = this.performRequest(options, cacheKey);
                    return response;
                }
                catch (error) {
                    (_b = this.logger) === null || _b === void 0 ? void 0 : _b.error(`Cache item '${cacheKey}' could not be loaded: ${error.message}`);
                }
            }
            const response = this.performRequest(options, cacheKey);
            return response;
        }
        return this.performRequest(options, cacheKey);
    }
}
exports.HTTPDataSource = HTTPDataSource;
//# sourceMappingURL=http-data-source.js.map