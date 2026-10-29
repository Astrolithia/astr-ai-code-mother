---
type: style
id: minimal-light
codeGenType: vue_project
uiLib: ant-design-vue
tags: [简约, 清爽, 浅色, 留白, 现代, 企业官网, 个人主页, 作品集]
description: 简约浅色风格，大量留白、低饱和配色、细边框与轻阴影，适合企业官网、个人主页、作品集、SaaS 产品介绍等需要干净专业观感的网站。
---
## 主题 token

在 App.vue 根部通过 a-config-provider 统一设置：

```vue
<template>
  <a-config-provider :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup>
const themeConfig = {
  token: {
    colorPrimary: '#2563eb',
    borderRadius: 8,
    fontSize: 15,
    colorBgLayout: '#ffffff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  }
}
</script>
```

## 视觉规范

- 背景：页面主体纯白 #ffffff，相邻区块交替使用 #f8fafc 区分层次
- 文字：标题 #0f172a，正文 #475569，辅助文字 #94a3b8
- 间距：区块上下内边距桌面端 96px、移动端 56px；内容最大宽度 1200px 居中
- 边框与阴影：卡片使用 1px #e2e8f0 边框，悬停时才出现 0 8px 24px rgba(15, 23, 42, 0.06) 阴影
- 字号层级：主标题 48px / 区块标题 32px / 卡片标题 18px，移动端主标题降到 32px
- 强调色只用于主按钮、链接和少量图标，单屏内不超过三处

## 禁止

- 渐变背景、大面积色块、霓虹或发光效果
- 同一页面出现两种以上强调色
