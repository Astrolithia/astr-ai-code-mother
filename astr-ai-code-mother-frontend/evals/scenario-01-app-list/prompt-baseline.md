# 场景一 · 对照组提示词（不加载 design.md）

运行前先 `mv design.md design.md.bak`，跑完再改回来。
以下内容原样发给 agent，不要临场增删。

---

你是一位前端程序员专家，帮我给项目搭好全局布局和第一个功能页面，要求如下：

1）全局布局文件 `components/layout/AppLayout.tsx`，在 `app/layout.tsx` 中引入，整体为上中下结构，支持响应式。

2）顶部导航栏独立成 `components/layout/AppHeader.tsx`。左侧是站点 logo 和名称「Astr」，中间是菜单项（我的应用、模板市场、文档），右侧是当前登录用户的头像和用户名，数据取自 `evals/scenario-01-app-list/data.json` 的 `user` 字段。

3）底部独立成 `components/layout/AppFooter.tsx`，内容为「Astr AI Code Mother © 2026」。

4）中间内容区渲染路由页面。

5）新建「我的应用」页面 `app/apps/page.tsx`，读取 `evals/scenario-01-app-list/data.json` 的 `apps` 字段并展示。每条要展示应用名、描述、状态、访问量、创建时间，已部署的要能点进部署地址。提供删除和重新生成两个操作。

6）使用 shadcn/ui 的组件实现，图标用 lucide-react。
