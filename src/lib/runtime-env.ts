import { getCloudflareContext } from '@opennextjs/cloudflare';

type RuntimeBindingMap = Record<string, unknown>;

function readFromCloudflareBindings(name: string): string | undefined {
  try {
    const context = getCloudflareContext() as unknown as { env?: RuntimeBindingMap } | undefined;
    const value = context?.env?.[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  } catch {
    // Running outside the Cloudflare runtime/bindings context.
  }

  return undefined;
}

export function readRuntimeEnv(name: string): string | undefined {
  const bindingValue = readFromCloudflareBindings(name);
  if (bindingValue) {
    return bindingValue;
  }

  const processValue = process.env[name];
  if (typeof processValue === 'string' && processValue.trim()) {
    return processValue.trim();
  }

  return undefined;
}
