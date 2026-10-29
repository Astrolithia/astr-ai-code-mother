---
type: component
id: vue-feature-cards
section: features
codeGenType: vue_project
uiLib: ant-design-vue
tags: [功能介绍, 特性, 卖点, 服务项目, 卡片网格, 图标卡片]
description: 功能特性卡片网格，每张卡片包含图标、标题和描述，桌面端三列、平板两列、移动端单列，适用于展示产品功能、服务项目、核心优势、团队成员等并列信息。
---
## 使用规则

- 网格必须使用 a-row 加 a-col，设置 :xs="24" :sm="12" :lg="8" 实现响应式列数
- 每一项必须使用 a-card，悬停效果使用 hoverable 属性
- 图标从 @ant-design/icons-vue 具名导入，通过 component :is 渲染
- 卡片数据写成数组用 v-for 渲染，不要逐个手写

## 参考代码

```vue
<template>
  <section class="features">
    <div class="features-inner">
      <a-typography-title :level="2" class="section-title">核心功能</a-typography-title>
      <a-row :gutter="[24, 24]">
        <a-col v-for="item in features" :key="item.title" :xs="24" :sm="12" :lg="8">
          <a-card hoverable class="feature-card">
            <component :is="item.icon" class="feature-icon" />
            <a-typography-title :level="4">{{ item.title }}</a-typography-title>
            <a-typography-paragraph type="secondary">{{ item.desc }}</a-typography-paragraph>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </section>
</template>

<script setup>
import { ThunderboltOutlined, SafetyOutlined, CloudOutlined } from '@ant-design/icons-vue'

const features = [
  { icon: ThunderboltOutlined, title: '极速响应', desc: '毫秒级加载体验，让用户无需等待。' },
  { icon: SafetyOutlined, title: '安全可靠', desc: '多重数据加密与备份，守护每一份信息。' },
  { icon: CloudOutlined, title: '云端同步', desc: '多设备实时同步，随时随地继续工作。' }
]
</script>

<style scoped>
.features {
  padding: 96px 24px;
}

.features-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  margin-bottom: 48px;
  text-align: center;
}

.feature-card {
  height: 100%;
}

.feature-icon {
  margin-bottom: 16px;
  font-size: 32px;
  color: var(--feature-icon-color, #1677ff);
}

@media (max-width: 768px) {
  .features {
    padding: 56px 16px;
  }
}
</style>
```
