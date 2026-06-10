import { env } from './env';

// Thin wrapper around the Google Maps web-service APIs. The key is held in
// env (server-only) and never reaches the client.
export async function gmaps(
  path: string,
  params: Record<string, string>,
): Promise<any> {
  const url = new URL(`https://maps.googleapis.com/maps/api/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', env.googleMapsApiKey);
  const res = await fetch(url.toString());
  return res.json();
}
