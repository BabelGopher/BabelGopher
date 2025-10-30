# Chrome Built‑in AI Setup (BabelGopher)

This guide enables Chrome’s on‑device AI features used by BabelGopher for translation via the Translator API or the Prompt API fallback.

## 1) Use Chrome Canary and secure context

- Install Chrome Canary: https://www.google.com/chrome/canary/
- Run the app on a secure context:
  - OK: http://localhost (dev) or https://your-domain (prod)
  - Avoid: file:// URLs or raw IPs without TLS

## 2) Enable required flags (chrome://flags)

Search and set the following flags:

- Prompt API for Gemini Nano

  - ID: `#prompt-api-for-gemini-nano`
  - Value: Enabled

- Optimization Guide On‑Device Model

  - ID: `#optimization-guide-on-device-model`
  - Value: Enabled BypassPerfRequirement

- Translation API (if present)
  - ID: `#translation-api`
  - Value: Enabled

Optional (NOT required for BabelGopher):

- AI Summarization API (`#enable-ai-summarization-api`)
- Text Safety Classifier (`#text-safety-classifier`)

After changing flags, click Relaunch.

## 3) Verify availability in DevTools Console

Paste the following in the Console:

```javascript
window.isSecureContext;
!!window.ai;
!!window.translation?.createTranslator;
(async () =>
  window.ai && window.ai.languageModel
    ? (await window.ai.languageModel.capabilities()).available
    : "no-ai")();
```

Expected:

- isSecureContext → true
- window.ai → true
- available → 'readily' or 'after-download' (first time)

## 4) First‑run model download

- Chrome may download on‑device models on first use (can take a few minutes).
- Check status: chrome://optimization-guide-internals → On‑Device Model: Ready

## 5) Troubleshooting

- window.ai is false

  - Ensure Canary build, flags set exactly as above, and you relaunched.
  - Use a non‑Incognito normal profile (policies/extensions may block models).

- available shows 'after-download' for a long time

  - Keep the tab open; the download continues in the background.

- Translator API unavailable
  - Fallback uses Prompt API automatically if `window.ai.languageModel` is available.

## 6) Useful references

- Chrome Built‑in AI docs: https://developer.chrome.com/docs/ai/built-in

