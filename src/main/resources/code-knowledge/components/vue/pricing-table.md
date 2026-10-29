---
type: component
id: vue-pricing-table
section: pricing
codeGenType: vue_project
uiLib: ant-design-vue
tags: [价格, 定价, 套餐, 会员, 订阅, 方案对比, 推荐方案]
description: 价格套餐对比区块，三档套餐卡片并列展示价格、权益列表和购买按钮，推荐方案带角标突出显示，适用于 SaaS 订阅、会员服务、课程报名、服务报价等场景。
---
## 使用规则

- 套餐卡片使用 a-card，推荐方案外层使用 Badge.Ribbon 显示角标（通过动态组件按需包裹），不要手写绝对定位角标
- 权益列表使用 a-list，每项前放 CheckOutlined 图标
- 只有推荐方案的按钮使用 type="primary"，其余使用默认按钮
- 网格使用 a-row 加 a-col，:xs="24" :md="8"

## 参考代码

```vue
<template>
  <section class="pricing">
    <div class="pricing-inner">
      <a-typography-title :level="2" class="section-title">选择适合你的方案</a-typography-title>
      <a-row :gutter="[24, 24]" align="stretch">
        <a-col v-for="plan in plans" :key="plan.name" :xs="24" :md="8">
          <component :is="plan.recommended ? BadgeRibbon : 'div'" v-bind="plan.recommended ? { text: '推荐' } : {}" class="plan-wrap">
            <a-card class="plan-card" :title="plan.name">
              <div class="plan-price">
                <span class="price">¥<span v-text="plan.price"></span></span>
                <span class="unit">/ 月</span>
              </div>
              <a-list :data-source="plan.benefits" :split="false" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <CheckOutlined class="check" />
                    <span v-text="item"></span>
                  </a-list-item>
                </template>
              </a-list>
              <a-button block size="large" :type="plan.recommended ? 'primary' : 'default'" class="plan-action">
                立即订阅
              </a-button>
            </a-card>
          </component>
        </a-col>
      </a-row>
    </div>
  </section>
</template>

<script setup>
import { Badge } from 'ant-design-vue'
import { CheckOutlined } from '@ant-design/icons-vue'

const BadgeRibbon = Badge.Ribbon

const plans = [
  { name: '基础版', price: 0, benefits: ['3 个项目', '基础模板', '社区支持'] },
  { name: '专业版', price: 49, recommended: true, benefits: ['无限项目', '全部模板', '自定义域名', '优先支持'] },
  { name: '团队版', price: 199, benefits: ['专业版全部权益', '10 个成员席位', '权限管理', '专属客服'] }
]
</script>

<style scoped>
.pricing {
  padding: 96px 24px;
}

.pricing-inner {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  margin-bottom: 48px;
  text-align: center;
}

.plan-wrap,
.plan-card {
  height: 100%;
}

.plan-price {
  margin-bottom: 16px;
}

.price {
  font-size: 36px;
  font-weight: 700;
}

.unit {
  margin-left: 4px;
  opacity: 0.6;
}

.check {
  margin-right: 8px;
  color: #52c41a;
}

.plan-action {
  margin-top: 24px;
}

@media (max-width: 768px) {
  .pricing {
    padding: 56px 16px;
  }
}
</style>
```
