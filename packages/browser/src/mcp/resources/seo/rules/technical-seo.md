# Technical SEO Implementation

The parent rule covers title/description format, canonical setup, robots directives, and social cards. This sub-rule covers **crawlability infrastructure** not in the checklist.

## robots.txt

```text
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Sitemap: https://example.com/sitemap.xml
```

Never block resources needed for rendering (CSS, JS, images).

## XML Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

- Maximum 50,000 URLs or 50MB per sitemap
- Use sitemap index for larger sites
- Include only canonical, indexable URLs
- Update `lastmod` only when content actually changes

## URL Structure

**Good:** `https://example.com/products/blue-widget`
**Bad:** `https://example.com/p?id=12345`

- Hyphens not underscores, lowercase only
- Short (< 75 characters)
- HTTPS always
- Avoid query parameters when possible

## Internal Linking

```html
<!-- BAD -->
<a href="/products">Click here</a>

<!-- GOOD — descriptive anchor text -->
<a href="/products/blue-widgets">Browse our blue widget collection</a>
```
