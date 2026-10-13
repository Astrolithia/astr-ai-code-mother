# Third-party notices

## Atlas navigation reference

- Reference: https://atlasformac.com/?ref=seesaw
- The AppHeader appearance and seven-spoke navigation symbol were adapted from this reference at the user's request; the brand text, routes and account functionality remain Astr's.
- Local header-only font files: `public/fonts/atlas-header/medium.woff2` and `semibold.woff2`.
- Font sources: https://atlasformac.com/assets/editorial-fonts/medium.woff2 and https://atlasformac.com/assets/editorial-fonts/semibold.woff2.
- No Atlas JavaScript, Framer runtime, tracking scripts or external font requests are included.
- Original artwork and font rights remain with their respective owners. Reference-site availability does not establish a commercial-use license; confirm applicable permissions before public or commercial distribution.

## Bencho Create menu

- Source: https://bencho.dev/?ref=seesaw&c=liq-create&theme=light
- Licence: https://bencho.dev/licence — the component and its copied CSS are MIT licensed.
- Copyright (c) 2026 Lorenzo Cabra.
- Files: `components/create-menu.tsx`, `app/create-menu.css`.
- Directly uses the source supplied by the user, retaining its explanatory comments, two-layer DOM, dimensions and Framer Motion spring. Astr integration adds configurable labels/items, a creation callback, loading/keyboard support and reduced-motion handling. Three app modes remove only the unused fourth row's 36px; the reusable component still defaults to the original four items.
- Bencho tokens are aliased to Astr's existing surface, ink, border and UI font on `.crt-stage` only. `components/create-menu-tokens.ts` converts Astr's resolved OKLCH colours into per-instance bare RGB triplets, including theme changes. No new global palette, external fonts, sounds, tracking scripts or Bencho site runtime are included.
- Dependencies: `framer-motion` and `lucide-react`, under their respective licences. Bencho's site, brand, fonts and photographs are not included in the block's licence or copied here.

```text
MIT License

Copyright (c) 2026 Lorenzo Cabra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Thinking Orbs

- Author: Yogesh
- Source: https://github.com/yogesharc/thinking-orbs
- Website: https://www.thinkingorbs.com/
- Installed from the official shadcn registry: https://www.thinkingorbs.com/r/orb.json
- Files: `components/orb.tsx`, `components/orb-core.ts`
- Local adaptation: pause animation in hidden tabs/off-screen and respond to changes in reduced-motion preferences.

```text
MIT License

Copyright (c) 2026 Yogesh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
