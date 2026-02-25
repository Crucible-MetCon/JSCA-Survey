const DEFAULT_K_THRESHOLD = 5;

function getKThreshold(): number {
  const envValue = process.env.K_ANONYMITY_THRESHOLD;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_K_THRESHOLD;
}

export interface KAnonResult<T> {
  data: T | null;
  suppressed: boolean;
  responseCount: number;
  message: string | null;
}

/**
 * Check if a data slice meets the k-anonymity threshold.
 * This single function is used by all data access paths:
 * UI charts, tables, PDF export, PPTX export.
 */
export function checkKAnonymity<T>(
  data: T,
  responseCount: number
): KAnonResult<T> {
  const k = getKThreshold();

  if (responseCount < k) {
    return {
      data: null,
      suppressed: true,
      responseCount,
      message: 'Insufficient responses to preserve anonymity.',
    };
  }

  return {
    data,
    suppressed: false,
    responseCount,
    message: null,
  };
}

/**
 * Get the current k-anonymity threshold value.
 */
export function getThreshold(): number {
  return getKThreshold();
}
