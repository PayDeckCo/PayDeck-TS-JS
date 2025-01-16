interface RequestHeaders {
  [key: string]: string;
}

type QueryParams = Record<string, string | number | boolean>;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface RequestOptions {
  body?: JsonValue;
  signal?: AbortSignal;
  queryParams?: QueryParams;
  headers?: RequestHeaders;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
}

class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

class HttpError extends Error {
  constructor(
    public status: number,
    message?: string,
  ) {
    super(message || HttpError.getDefaultMessage(status));
    this.name = 'HttpError';
  }

  private static getDefaultMessage(status: number) {
    if (status >= 400 && status < 500) return `Client error: ${status}`;
    if (status >= 500) return `Server error: ${status}`;
    return `HTTP error: ${status}`;
  }
}

class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * HTTP client for making API requests with typed responses
 */
export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string, queryParams?: QueryParams): string {
    const url = new URL(path, this.baseUrl);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => url.searchParams.append(key, String(value)));
    }
    return url.toString();
  }

  private getDefaultHeaders(): RequestHeaders {
    return { 'Content-Type': 'application/json' };
  }

  private async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { queryParams, body, headers, ...requestOptions } = options;

    try {
      const response = await fetch(this.buildUrl(url, queryParams), {
        body: body ? JSON.stringify(body) : undefined,
        headers: { ...this.getDefaultHeaders(), ...headers },
        ...requestOptions,
      });

      if (!response.ok) {
        throw new HttpError(response.status, response.statusText);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') throw new TimeoutError();
        if (error.message.includes('fetch')) throw new NetworkError();
      }
      throw error;
    }
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request(path, { ...options, method: 'GET' });
  }

  post<T, D extends JsonValue>(path: string, data: D, options: RequestOptions = {}): Promise<T> {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: data,
    });
  }

  put<T, D extends JsonValue>(path: string, data: D, options: RequestOptions = {}): Promise<T> {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: data,
    });
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request(path, { ...options, method: 'DELETE' });
  }

  patch<T, D extends JsonValue>(path: string, data: D, options: RequestOptions = {}): Promise<T> {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body: data,
    });
  }
}
