export async function toUrlSearchParams(
  input?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>,
) {
  const resolved = input ? await input : {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params;
}
