import type { Fetcher } from '@/shared/http'
import { log } from '@/shared/logger'

/** Strip markup and collapse whitespace so a headline is one safe line. */
function cleanHeadline(raw: string): string | null {
  const text = raw
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null
  // Drop anything that still carries a link or control characters; the model
  // treats these as untrusted data, so keep them plain and short.
  if (/https?:\/\/|www\./i.test(text)) return null
  const printable = [...text].every((character) => {
    const code = character.charCodeAt(0)
    return code >= 32 || code === 9
  })
  if (!printable) return null
  return text.slice(0, 160)
}

/** Pull `<title>` (RSS/Atom) entries, skipping the channel/feed title. */
function fromRss(body: string): string[] {
  const titles = [...body.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map(
    (match) => match[1] ?? ''
  )
  // The first <title> is the feed name, not an article.
  return titles.slice(1)
}

/** Pull common JSON headline fields from an array or `{ articles: [...] }`. */
function fromJson(body: string): string[] {
  const data = JSON.parse(body) as unknown
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { articles?: unknown[] })?.articles)
      ? (data as { articles: unknown[] }).articles
      : []
  return list
    .map((item) => {
      const entry = item as { title?: unknown; headline?: unknown }
      const value = entry.title ?? entry.headline
      return typeof value === 'string' ? value : ''
    })
    .filter(Boolean)
}

/**
 * Fetch today's Ho Chi Minh City news as a short list of safe, plain headlines.
 * Returns an empty list when no feed is configured or the fetch fails; the
 * director then drafts a day from the city snapshot alone. Headlines are
 * untrusted world data: they are stripped of markup and links before use.
 */
export async function fetchCityNews(
  fetcher: Fetcher,
  url: string | undefined,
  timeoutMs: number,
  limit = 8
): Promise<string[]> {
  if (!url) return []
  try {
    const response = await fetcher(url, {
      headers: { accept: 'application/rss+xml, application/json, text/xml' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) return []
    const body = await response.text()
    const contentType = response.headers.get('content-type') ?? ''
    const raw =
      contentType.includes('json') || body.trimStart().startsWith('[')
        ? fromJson(body)
        : fromRss(body)
    const headlines: string[] = []
    for (const candidate of raw) {
      const clean = cleanHeadline(candidate)
      if (clean && !headlines.includes(clean)) headlines.push(clean)
      if (headlines.length >= limit) break
    }
    return headlines
  } catch (error) {
    log(
      'director_news_unavailable',
      `city news fetch failed: ${(error as Error).message}`,
      'warn'
    )
    return []
  }
}
