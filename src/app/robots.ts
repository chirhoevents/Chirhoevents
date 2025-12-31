import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/poros/parent/',
          '/poros/review/',
          '/api/',
          '/sign-in',
          '/sign-up',
          '/invite/',
          '/registration/confirmation/',
        ],
      },
    ],
    sitemap: 'https://chirhoevents.com/sitemap.xml',
  }
}
