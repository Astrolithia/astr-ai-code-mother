---
type: component
id: vue-site-footer
section: footer
codeGenType: vue_project
uiLib: ant-design-vue
tags: [页脚, 底部, 版权, 友情链接, 联系方式, 备案]
description: 网站页脚，包含品牌简介、多列链接分组和联系方式，底部是版权信息，移动端分列堆叠，适用于各类多页面网站的统一底部。
---
## 使用规则

- 外层必须使用 a-layout-footer
- 多列使用 a-row 加 a-col，:xs="24" :sm="12" :md="6"
- 版权区与上方内容之间使用 a-divider 分隔
- 链接分组写成数组用 v-for 渲染

## 参考代码

```vue
<template>
  <a-layout-footer class="footer">
    <div class="footer-inner">
      <a-row :gutter="[32, 32]">
        <a-col :xs="24" :md="6">
          <div class="footer-brand">品牌名称</div>
          <a-typography-paragraph type="secondary">一句话介绍品牌的使命与愿景。</a-typography-paragraph>
        </a-col>
        <a-col v-for="group in linkGroups" :key="group.title" :xs="24" :sm="12" :md="6">
          <div class="footer-title"><span v-text="group.title"></span></div>
          <a v-for="link in group.links" :key="link.label" :href="link.href" class="footer-link">
            <span v-text="link.label"></span>
          </a>
        </a-col>
      </a-row>
      <a-divider />
      <a-typography-text type="secondary">© 2026 品牌名称 版权所有</a-typography-text>
    </div>
  </a-layout-footer>
</template>

<script setup>
const linkGroups = [
  {
    title: '产品',
    links: [
      { label: '功能介绍', href: '#/products' },
      { label: '价格方案', href: '#/pricing' }
    ]
  },
  {
    title: '公司',
    links: [
      { label: '关于我们', href: '#/about' },
      { label: '加入我们', href: '#/careers' }
    ]
  },
  {
    title: '联系',
    links: [
      { label: 'hello@example.com', href: 'mailto:hello@example.com' },
      { label: '400-000-0000', href: 'tel:4000000000' }
    ]
  }
]
</script>

<style scoped>
.footer {
  padding: 64px 24px 32px;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.footer-brand {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
}

.footer-title {
  margin-bottom: 12px;
  font-weight: 600;
}

.footer-link {
  display: block;
  margin-bottom: 8px;
  color: inherit;
  opacity: 0.65;
}

.footer-link:hover {
  opacity: 1;
}
</style>
```
