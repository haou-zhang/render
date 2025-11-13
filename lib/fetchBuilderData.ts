const DEFAULT_ENDPOINT = 'https://app.messesum.com/builder/render/';
const REQUEST_TIMEOUT_MS = 12_000;

export interface BuilderResponse {
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

class RemoteDataError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RemoteDataError';
    this.status = status;
  }
}

export async function fetchBuilderData(token: string): Promise<BuilderResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const endpoint = process.env.RENDER_DATA_ENDPOINT ?? DEFAULT_ENDPOINT;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'render.messesum.com/pdf-proxy'
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new RemoteDataError('上游接口返回异常', response.status);
    }

    const payload = (await response.json()) as BuilderResponse;
    if (!payload || typeof payload !== 'object') {
      throw new RemoteDataError('上游响应格式不正确');
    }
    if (!payload.data || typeof payload.data !== 'object') {
      throw new RemoteDataError('缺少 data 字段');
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new RemoteDataError('拉取数据超时');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export { RemoteDataError };
