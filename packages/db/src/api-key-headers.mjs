// API keys identify the application; an optional user JWT identifies its session.
export function supabaseKeyHeaders(key, userToken) {
  const headers = {apikey: key};
  const bearer = userToken ?? (/^sb_(publishable|secret)_/.test(key) ? undefined : key);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  return headers;
}
