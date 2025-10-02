export const REF_PARAM_KEY = "ref";
export const REF_PARAM_VALUE = "quests.dev";

export function addRef(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set(REF_PARAM_KEY, REF_PARAM_VALUE);
    return urlObj.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${REF_PARAM_KEY}=${REF_PARAM_VALUE}`;
  }
}
