export const parseRecoveryTokensFromUrl = (
  url: string
): { access_token?: string; refresh_token?: string } => {
  const out: { access_token?: string; refresh_token?: string } = {};
  const hashPart = url.includes("#") ? (url.split("#")[1] ?? "") : "";
  const beforeHash = url.split("#")[0] ?? url;
  const queryPart = beforeHash.includes("?")
    ? (beforeHash.split("?")[1] ?? "")
    : "";

  const merge = (raw: string) => {
    if (!raw) {
      return;
    }
    const q = new URLSearchParams(raw);
    const at = q.get("access_token");
    const rt = q.get("refresh_token");
    if (at) {
      out.access_token = at;
    }
    if (rt) {
      out.refresh_token = rt;
    }
  };

  merge(hashPart);
  merge(queryPart);
  return out;
};
