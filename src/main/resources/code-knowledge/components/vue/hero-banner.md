---
type: component
id: vue-hero-banner
section: hero
codeGenType: vue_project
uiLib: ant-design-vue
tags: [首屏, 横幅, Banner, 主视觉, 标语, 行动按钮, 落地页]
description: 首页首屏主视觉区块，左侧是主标题、副标题和两个行动按钮，右侧是配图，移动端上下堆叠，适用于官网首页、产品落地页、活动页的开场展示。
---
## 使用规则

- 左右分栏必须使用 a-row 和 a-col，通过 xs、md 属性实现移动端堆叠
- 标题和段落使用 a-typography-title、a-typography-paragraph
- 按钮组使用 a-space 包裹 a-button，主按钮 type="primary" 且只有一个
- 配图使用普通 img 标签，设置 width: 100% 防止溢出

## 参考代码

```vue
<template>
  <section class="hero">
    <a-row :gutter="[48, 32]" align="middle" class="hero-inner">
      <a-col :xs="24" :md="12">
        <a-typography-title :level="1" class="hero-title">让每一次创作都更简单</a-typography-title>
        <a-typography-paragraph class="hero-desc">
          用一句话描述你的核心价值，再用一句话说明用户能获得什么。
        </a-typography-paragraph>
        <a-space :size="16" wrap>
          <a-button type="primary" size="large">免费开始</a-button>
          <a-button size="large">
            <template #icon><PlayCircleOutlined /></template>
            观看演示
          </a-button>
        </a-space>
      </a-col>
      <a-col :xs="24" :md="12">
        <img class="hero-image" src="https://picsum.photos/720/520" alt="产品主视觉" />
      </a-col>
    </a-row>
  </section>
</template>

<script setup>
import { PlayCircleOutlined } from '@ant-design/icons-vue'
</script>

<style scoped>
.hero {
  padding: 96px 24px;
}

.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.hero-title {
  font-size: 48px;
  line-height: 1.2;
}

.hero-desc {
  margin: 16px 0 32px;
  font-size: 18px;
}

.hero-image {
  width: 100%;
  border-radius: 16px;
  object-fit: cover;
}

@media (max-width: 768px) {
  .hero {
    padding: 56px 16px;
  }

  .hero-title {
    font-size: 32px;
  }
}
</style>
```
