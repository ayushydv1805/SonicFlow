const AUDIUS_API = "https://api.audius.co/v1";

export async function searchAudiusTracks(query) {
  if (!query.trim()) {
    return [];
  }

  const url =
    `${AUDIUS_API}/tracks/search` +
    `?query=${encodeURIComponent(query)}` +
    `&limit=20`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Audius API Error: ${response.status}`);
  }

  const result = await response.json();

  return result.data || [];
}