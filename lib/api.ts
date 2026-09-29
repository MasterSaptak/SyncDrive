export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const SIMULATED_LATENCY_MS = 100;

export async function mockFetch<T>(
  dataOrFn: T | (() => T | Promise<T>),
  options?: { shouldFail?: boolean; errorMessage?: string; latency?: number }
): Promise<T> {
  const latency = options?.latency ?? SIMULATED_LATENCY_MS;
  await new Promise((resolve) => setTimeout(resolve, latency));

  if (options?.shouldFail) {
    throw new ApiError(options.errorMessage || "An unexpected error occurred", 400);
  }

  if (typeof dataOrFn === "function") {
    return (dataOrFn as () => T | Promise<T>)();
  }

  return dataOrFn;
}
