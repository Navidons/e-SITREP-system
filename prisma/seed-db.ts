import { PrismaClient } from "@prisma/client";

const RETRYABLE = new Set(["P1017", "P1001", "P1008", "P1011"]);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableDbError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: string }).code === "string" &&
    RETRYABLE.has((error as { code: string }).code)
  );
}

/** Reconnect and retry when Render / remote Postgres drops idle connections during long seeds. */
export async function withDbRetry<T>(
  prisma: PrismaClient,
  fn: (db: PrismaClient) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(prisma);
    } catch (error) {
      lastError = error;
      if (!isRetryableDbError(error) || attempt === maxAttempts) {
        throw error;
      }
      console.warn(
        `Database connection interrupted (attempt ${attempt}/${maxAttempts}), reconnecting…`,
      );
      try {
        await prisma.$disconnect();
      } catch {
        /* ignore */
      }
      await delay(1500 * attempt);
      await prisma.$connect();
    }
  }
  throw lastError;
}
