import { describe, expect, it } from 'vitest'
import { fetchCityNews } from '@/features/director/news'

const rss = `<?xml version="1.0"?><rss><channel>
<title>HCMC Daily</title>
<item><title><![CDATA[City opens a new riverside park]]></title></item>
<item><title>Market festival draws crowds</title></item>
<item><title>Read more at http://spam.example</title></item>
<item><title>Market festival draws crowds</title></item>
</channel></rss>`

const json = JSON.stringify({
  articles: [
    { title: 'Rain expected downtown' },
    { headline: 'Night market reopens' },
  ],
})

describe('city news fetch', () => {
  it('returns no headlines without a configured feed', async () => {
    const news = await fetchCityNews(
      async () => new Response(''),
      undefined,
      100
    )
    expect(news).toEqual([])
  })

  it('parses, de-duplicates, and drops link-bearing RSS titles', async () => {
    const fetcher = async () =>
      new Response(rss, { headers: { 'content-type': 'application/rss+xml' } })
    const news = await fetchCityNews(fetcher, 'https://news.example/rss', 100)
    expect(news).toEqual([
      'City opens a new riverside park',
      'Market festival draws crowds',
    ])
  })

  it('reads JSON title and headline fields', async () => {
    const fetcher = async () =>
      new Response(json, { headers: { 'content-type': 'application/json' } })
    const news = await fetchCityNews(fetcher, 'https://news.example/json', 100)
    expect(news).toEqual(['Rain expected downtown', 'Night market reopens'])
  })

  it('returns an empty list when the fetch fails', async () => {
    const fetcher = async () => {
      throw new Error('offline')
    }
    const news = await fetchCityNews(fetcher, 'https://news.example/rss', 100)
    expect(news).toEqual([])
  })
})
