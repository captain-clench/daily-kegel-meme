import { useState, useEffect } from 'react';
import { useLocalStorageState as useAhooksLocalStorageState } from 'ahooks';
import type { Options } from 'ahooks/lib/createUseStorageState';

/**
 * Wrapper around ahooks useLocalStorageState that automatically adds a prefix to the key
 * and handles hydration issues by ensuring localStorage is only accessed on the client
 *
 * @param key - The storage key (prefix will be added automatically)
 * @param options - Same options as ahooks useLocalStorageState
 * @returns Same return value as ahooks useLocalStorageState
 *
 * @example
 * ```tsx
 * // If NEXT_PUBLIC_CACHE_PREFIX = "myapp_"
 * // This will store as "myapp_user_settings"
 * const [settings, setSettings] = useLocalStorageState('user_settings', {
 *   defaultValue: { theme: 'dark' }
 * });
 * ```
 */
export function useLocalStorageState<T>(
  key: string,
  options?: Options<T>
) {
  // Track if we're on the client side
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  // Get prefix from environment variable, default to empty string if not set
  const prefix = process.env.NEXT_PUBLIC_CACHE_PREFIX || '';

  // Add prefix to key
  const prefixedKey = `${prefix}${key}`;

  // Call original hook with prefixed key
  const [value, setValue] = useAhooksLocalStorageState<T>(prefixedKey, {
    ...options,
    // During SSR, always use default value
    defaultValue: options?.defaultValue,
  });

  // During SSR, return default value to avoid hydration mismatch
  if (!isClient) {
    return [options?.defaultValue as T, setValue] as const;
  }

  // On client, return actual localStorage value
  return [value, setValue] as const;
}

export default useLocalStorageState;
