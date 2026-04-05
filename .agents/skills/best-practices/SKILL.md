---
name: best-practices
description: Apply modern web development best practices for security, compatibility, and code quality. Use when asked to "apply best practices", "security audit", "modernize code", "code quality review", or "check for vulnerabilities".
license: MIT
metadata:
  author: web-quality-skills
  version: "1.0"
---

# Best practices

Modern web development standards based on Lighthouse best practices audits. Covers security, browser compatibility, and code quality patterns.

## Security

### HTTPS everywhere

```html
<!-- Bad — mixed content -->
<img src="http://example.com/image.jpg">
<script src="http://cdn.example.com/script.js"></script>

<!-- Good — HTTPS only -->
<img src="https://example.com/image.jpg">
<script src="https://cdn.example.com/script.js"></script>
```

**HSTS Header:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Content Security Policy (CSP)

**CSP Header (recommended):**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123' https://trusted.com;
  style-src 'self' 'nonce-abc123';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self';
```

**Using nonces for inline scripts:**
```html
<script nonce="abc123">
  // This inline script is allowed
</script>
```

### Security headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### No vulnerable libraries

```bash
npm audit
npm audit fix
```

**Known vulnerable patterns to avoid:**
```javascript
// Bad — prototype pollution vulnerable patterns
Object.assign(target, userInput);
_.merge(target, userInput);

// Good — safer alternatives
const safeData = JSON.parse(JSON.stringify(userInput));
```

### Input sanitization

```javascript
// Bad — XSS vulnerable
element.innerHTML = userInput;
document.write(userInput);

// Good — safe text content
element.textContent = userInput;

// Good — if HTML needed, sanitize
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### Secure cookies

```
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Strict; Path=/
```

---

## Browser compatibility

### Doctype declaration

```html
<!-- Bad — missing or invalid doctype -->
<HTML>

<!-- Good — HTML5 doctype -->
<!DOCTYPE html>
<html lang="en">
```

### Character encoding

```html
<!-- Bad — missing or late charset -->
<html>
<head>
  <title>Page</title>
  <meta charset="UTF-8">
</head>

<!-- Good — charset as first element in head -->
<html>
<head>
  <meta charset="UTF-8">
  <title>Page</title>
</head>
```

### Viewport meta tag

```html
<!-- Good — responsive viewport -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page</title>
</head>
```

### Feature detection

```javascript
// Bad — browser detection (brittle)
if (navigator.userAgent.includes('Chrome')) {
  // Chrome-specific code
}

// Good — feature detection
if ('IntersectionObserver' in window) {
  // Use IntersectionObserver
} else {
  // Fallback
}
```

```css
/* Good — @supports in CSS */
@supports (display: grid) {
  .container {
    display: grid;
  }
}

@supports not (display: grid) {
  .container {
    display: flex;
  }
}
```

---

## Deprecated APIs

### Avoid these

```javascript
// Bad — document.write (blocks parsing)
document.write('<script src="..."><\/script>');

// Good — dynamic script loading
const script = document.createElement('script');
script.src = '...';
document.head.appendChild(script);

// Bad — synchronous XHR (blocks main thread)
const xhr = new XMLHttpRequest();
xhr.open('GET', url, false);

// Good — async fetch
const response = await fetch(url);
```

### Event listener passive

```javascript
// Bad — non-passive touch/wheel (may block scrolling)
element.addEventListener('touchstart', handler);
element.addEventListener('wheel', handler);

// Good — passive listeners (allows smooth scrolling)
element.addEventListener('touchstart', handler, { passive: true });
element.addEventListener('wheel', handler, { passive: true });
```

---

## Console & errors

### Error handling

```javascript
// Bad — unhandled errors in production
console.log('Debug info');
throw new Error('Unhandled');

// Good — proper error handling
try {
  riskyOperation();
} catch (error) {
  errorTracker.captureException(error);
  showErrorMessage('Something went wrong. Please try again.');
}
```

### Global error handler

```javascript
window.addEventListener('error', (event) => {
  errorTracker.captureException(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  errorTracker.captureException(event.reason);
});
```

---

## Source maps

### Production configuration

```javascript
// Bad — source maps exposed in production
module.exports = {
  devtool: 'source-map',
};

// Good — hidden source maps (uploaded to error tracker)
module.exports = {
  devtool: 'hidden-source-map',
};

// Good — or no source maps in production
module.exports = {
  devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
};
```

---

## Performance best practices

### Avoid blocking patterns

```html
<!-- Bad — blocking script -->
<script src="heavy-library.js"></script>

<!-- Good — deferred script -->
<script defer src="heavy-library.js"></script>

<!-- Good — link tags for parallel CSS loading (avoid @import) -->
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="other-styles.css">
```

### Efficient event handlers

```javascript
// Bad — handler on every element
items.forEach(item => {
  item.addEventListener('click', handleClick);
});

// Good — event delegation
container.addEventListener('click', (event) => {
  if (event.target.matches('.item')) {
    handleClick(event);
  }
});
```

### Memory management

```javascript
// Bad — memory leak (never removed)
const handler = () => { /* ... */ };
window.addEventListener('resize', handler);

// Good — using AbortController for cleanup
const controller = new AbortController();
window.addEventListener('resize', handler, { signal: controller.signal });

// Cleanup:
controller.abort();
```

---

## Code quality

### Valid HTML

```html
<!-- Bad — invalid HTML -->
<div id="header">
<div id="header"> <!-- Duplicate ID -->

<ul>
  <div>Item</div> <!-- Invalid child -->
</ul>

<!-- Good — valid HTML -->
<header id="site-header">
</header>

<ul>
  <li>Item</li>
</ul>
```

### Semantic HTML

```html
<!-- Bad — non-semantic -->
<div class="header">
  <div class="nav">
    <div class="nav-item">Home</div>
  </div>
</div>

<!-- Good — semantic HTML5 -->
<header>
  <nav>
    <a href="/">Home</a>
  </nav>
</header>
<main>
  <article>
    <h1>Headline</h1>
  </article>
</main>
```

### Image aspect ratios

```html
<!-- Bad — distorted images -->
<img src="photo.jpg" width="300" height="100">

<!-- Good — preserve aspect ratio -->
<img src="photo.jpg" width="300" height="225">

<!-- Good — CSS object-fit for flexibility -->
<img src="photo.jpg" style="width: 300px; height: 200px; object-fit: cover;">
```

---

## Permissions & privacy

### Request permissions properly

```javascript
// Bad — request on page load (bad UX, often denied)
navigator.geolocation.getCurrentPosition(success, error);

// Good — request in context, after user action
findNearbyButton.addEventListener('click', async () => {
  if (await showPermissionExplanation()) {
    navigator.geolocation.getCurrentPosition(success, error);
  }
});
```

### Permissions policy

```html
<!-- Restrict powerful features -->
<meta http-equiv="Permissions-Policy"
      content="geolocation=(), camera=(), microphone=()">

<!-- Allow for specific origins -->
<meta http-equiv="Permissions-Policy"
      content="geolocation=(self 'https://maps.example.com')">
```

---

## Audit checklist

### Security (critical)
- [ ] HTTPS enabled, no mixed content
- [ ] No vulnerable dependencies (`npm audit`)
- [ ] CSP headers configured
- [ ] Security headers present
- [ ] No exposed source maps

### Compatibility
- [ ] Valid HTML5 doctype
- [ ] Charset declared first in head
- [ ] Viewport meta tag present
- [ ] No deprecated APIs used
- [ ] Passive event listeners for scroll/touch

### Code quality
- [ ] No console errors
- [ ] Valid HTML (no duplicate IDs)
- [ ] Semantic HTML elements used
- [ ] Proper error handling
- [ ] Memory cleanup in components

### UX
- [ ] No intrusive interstitials
- [ ] Permission requests in context
- [ ] Clear error messages
- [ ] Appropriate image aspect ratios

## Tools

| Tool | Purpose |
|------|---------|
| `npm audit` | Dependency vulnerabilities |
| [SecurityHeaders.com](https://securityheaders.com) | Header analysis |
| [W3C Validator](https://validator.w3.org) | HTML validation |
| Lighthouse | Best practices audit |
| [Observatory](https://observatory.mozilla.org) | Security scan |

## References

- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Quality Audit](../web-quality-audit/SKILL.md)
