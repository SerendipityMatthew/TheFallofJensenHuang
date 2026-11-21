export function canonicalUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Source must be an HTTP URL');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString();
}
export function articleKey(article) {
  return canonicalUrl(article.source);
}
export function canPublish(article) {
  return article.metadata_status === 'Verified' && Boolean(article.source && article.headline && article.publication && article.published_at && article.authors?.length && article.source_checked_at);
}
