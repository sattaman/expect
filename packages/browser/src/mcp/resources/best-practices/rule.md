---
name: best-practices
description: >
  Browser compatibility, deprecated APIs, HTML validity, and code quality. Use when checking
  for deprecated APIs (document.write, sync XHR), missing doctype/charset/viewport, invalid HTML,
  non-semantic markup, source map exposure, or missing error handlers. For security issues
  (XSS, CSP, CORS, cookies), use the security rule instead.
---

# Best Practices

For security (XSS, CSP, CORS, cookies, CSRF), use `expect://rules/security`.

## Checklist

### Browser Compatibility (HIGH)

- [ ] Valid `<!DOCTYPE html>` declaration
- [ ] `<meta charset="UTF-8">` as first element in `<head>`
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Feature detection over browser detection (`'IntersectionObserver' in window`)
- [ ] `@supports` for CSS feature detection
- [ ] No deprecated APIs: `document.write`, synchronous XHR, Application Cache, mutation events

### Event Listeners (HIGH)

- [ ] Passive listeners for touch/wheel: `{ passive: true }`
- [ ] Event delegation over per-element handlers
- [ ] Memory cleanup: `AbortController` for listener removal

### HTML Quality (MEDIUM)

- [ ] No console errors in production
- [ ] Valid HTML — no duplicate IDs, proper nesting, no `<a>` wrapping `<button>`
- [ ] Semantic elements: `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`
- [ ] Images have correct aspect ratios (`object-fit` or matching `width`/`height`)
- [ ] No exposed source maps in production builds

### Error Handling (MEDIUM)

- [ ] Global `window.addEventListener('error', ...)` and `unhandledrejection` handlers
- [ ] Error boundaries in React component trees
- [ ] No unhandled promise rejections

### UX (LOW)

- [ ] No intrusive interstitials on mobile
- [ ] Permission requests in context (after user action, with explanation)
- [ ] Destructive actions require confirmation or undo

## Sub-Rules

- `expect://rules/best-practices/deprecated-apis`
- `expect://rules/best-practices/html-quality`
