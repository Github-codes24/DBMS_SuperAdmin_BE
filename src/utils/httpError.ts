// utils/httpError.ts

export function httpError(statusCode: number, code: string, message: string) {
    return Object.assign(new Error(message), { statusCode, code });
  }

  export function isDuplicateKey(e: unknown): boolean {
    return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
  }