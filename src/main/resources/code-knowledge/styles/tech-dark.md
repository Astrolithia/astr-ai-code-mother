---
type: style
id: tech-dark
codeGenType: vue_project
uiLib: ant-design-vue
tags: [科技, 暗色, 深色, 炫酷, 未来感, 开发者, AI 产品, 游戏]
description: 科技暗色风格，深色背景、高对比强调色、渐变点缀与发光细节，适合 AI 产品、开发者工具、游戏、数码硬件、科技发布会等需要未来感的网站。
---
## 主题 token

在 App.vue 根部通过 a-config-provider 统一设置，必须使用 darkAlgorithm 让所有组件自动切换为暗色：

```vue
<template>
  <a-config-provider :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import { theme } from 'ant-design-vue'

const themeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#7c3aed',
    borderRadius: 12,
    colorBgLayout: '#0b0b14',
    colorBgContainer: '#151522'
  }
}
</script>
```

## 视觉规范

- 背景：页面主体 #0b0b14，卡片 #151522，相邻区块可用 #10101c 区分
- 文字：标题 #f8fafc，正文 #a1a1aa，辅助文字 #71717a
- 强调：主色 #7c3aed，辅助色 #06b6d4；主标题关键词可使用两色线性渐变文字
- 间距：区块上下内边距桌面端 112px、移动端 64px；内容最大宽度 1200px 居中
- 边框与阴影：卡片使用 1px rgba(255, 255, 255, 0.08) 边框，悬停时出现 0 0 24px rgba(124, 58, 237, 0.35) 发光阴影
- 首屏可加一层主色径向渐变光晕作为背景装饰

## 禁止

- 浅色背景区块，破坏整体暗色氛围
- 纯黑 #000000 背景与纯白 #ffffff 大段正文，对比过强伤眼
