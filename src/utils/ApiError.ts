interface ErrorOptions {
  cause?: unknown;
}

export interface ApiErrorOptions extends ErrorOptions {
  status?: number;
}

export class ApiError extends Error {
  status: number | undefined;
  constructor(message: string, options?: ApiErrorOptions) {
    super(message);
    this.status = options?.status;
  }
}

export async function getApiError(response: any) {
  const body = await response.json();
  return new ApiError(body.msg || "server_error", {
    status: body?.status,
  });
}
