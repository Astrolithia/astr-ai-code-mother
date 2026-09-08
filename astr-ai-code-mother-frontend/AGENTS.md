<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 设计规范

任何生成或修改用户界面的工作，动手前必须先完整读一遍项目根目录的 `design.md`，并按其中的规则执行。

- `design.md` 规定了可用的技术底座、视觉系统、禁止出现的模式，以及交付前的自检清单。
- 只允许使用 `design.md`「技术底座」一节列出的东西。不要新增 CSS 文件，不要自定义字号、间距、颜色、圆角、阴影。
- 交付前逐条走完其中的「交付前自检」，发现问题就改，改完重新检查。自检过程不要输出，直接交付改好的代码。
- 生成结果不符合预期时，改 `design.md` 里的规则，而不是只改那一个页面。
