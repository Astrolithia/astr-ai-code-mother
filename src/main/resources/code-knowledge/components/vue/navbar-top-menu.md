---
type: component
id: vue-navbar-top-menu
section: navbar
codeGenType: vue_project
uiLib: ant-design-vue
tags: [导航栏, 顶部导航, 菜单, 响应式, 移动端折叠, 路由跳转]
description: 网站顶部导航栏，包含品牌名、横向菜单和右侧行动按钮，移动端折叠为抽屉菜单，菜单项与路由联动高亮，适用于官网、落地页、多页面网站。
---
## 使用规则

- 桌面端必须使用 a-menu mode="horizontal"，移动端必须使用 a-drawer 包裹 a-menu mode="inline"
- 菜单项通过 items 属性传入，key 直接使用路由路径，点击时 router.push(key)
- 当前路由通过 selectedKeys 高亮，不要手写 active 样式
- 桌面与移动端的切换使用 CSS 媒体查询控制显隐

## 参考代码

```vue
<template>
  <a-layout-header class="navbar">
    <div class="navbar-inner">
      <router-link to="/" class="brand">品牌名称</router-link>

      <a-menu
        class="desktop-menu"
        mode="horizontal"
        :items="menuItems"
        :selected-keys="[route.path]"
        @click="onMenuClick"
      />

      <a-button class="desktop-action" type="primary">立即体验</a-button>

      <a-button class="mobile-trigger" type="text" @click="drawerOpen = true">
        <template #icon><MenuOutlined /></template>
      </a-button>
    </div>

    <a-drawer v-model:open="drawerOpen" placement="right" :width="260" title="品牌名称">
      <a-menu mode="inline" :items="menuItems" :selected-keys="[route.path]" @click="onMenuClick" />
    </a-drawer>
  </a-layout-header>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MenuOutlined } from '@ant-design/icons-vue'

const route = useRoute()
const router = useRouter()
const drawerOpen = ref(false)

const menuItems = [
  { key: '/', label: '首页' },
  { key: '/products', label: '产品' },
  { key: '/about', label: '关于我们' },
  { key: '/contact', label: '联系我们' }
]

const onMenuClick = ({ key }) => {
  drawerOpen.value = false
  router.push(key)
}
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 0 24px;
  background: var(--navbar-bg, #ffffff);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.navbar-inner {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
}

.brand {
  font-size: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.desktop-menu {
  flex: 1;
  min-width: 0;
  border-bottom: none;
  background: transparent;
}

.mobile-trigger {
  display: none;
  margin-left: auto;
}

@media (max-width: 768px) {
  .desktop-menu,
  .desktop-action {
    display: none;
  }

  .mobile-trigger {
    display: inline-flex;
  }
}
</style>
```
