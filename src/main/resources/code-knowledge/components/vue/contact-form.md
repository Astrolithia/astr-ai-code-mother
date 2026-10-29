---
type: component
id: vue-contact-form
section: contact
codeGenType: vue_project
uiLib: ant-design-vue
tags: [联系我们, 表单, 留言, 预约, 报名, 咨询, 表单校验]
description: 联系咨询表单，包含姓名、手机号、咨询类型和留言内容，带必填与格式校验，提交成功后弹出提示并重置表单，适用于联系我们、在线预约、活动报名、意见反馈等页面。
---
## 使用规则

- 表单必须使用 a-form 绑定 model 与 rules，校验通过后由 @finish 触发提交，不要手写校验逻辑
- 每个字段使用 a-form-item，name 与 model 字段一一对应
- 提交成功反馈使用 ant-design-vue 导出的 message.success
- 表单宽度限制在 640px 以内并居中

## 参考代码

```vue
<template>
  <section class="contact">
    <a-card class="contact-card" title="联系我们">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="onFinish">
        <a-form-item label="姓名" name="name">
          <a-input v-model:value="form.name" placeholder="请输入你的姓名" />
        </a-form-item>
        <a-form-item label="手机号" name="phone">
          <a-input v-model:value="form.phone" placeholder="请输入 11 位手机号" />
        </a-form-item>
        <a-form-item label="咨询类型" name="type">
          <a-select v-model:value="form.type" placeholder="请选择" :options="typeOptions" />
        </a-form-item>
        <a-form-item label="留言内容" name="message">
          <a-textarea v-model:value="form.message" :rows="4" placeholder="请描述你的需求" />
        </a-form-item>
        <a-button type="primary" html-type="submit" block size="large">提交</a-button>
      </a-form>
    </a-card>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'

const formRef = ref()
const form = reactive({ name: '', phone: '', type: undefined, message: '' })

const typeOptions = [
  { value: 'business', label: '商务合作' },
  { value: 'support', label: '技术支持' },
  { value: 'other', label: '其他' }
]

const rules = {
  name: [{ required: true, message: '请输入姓名' }],
  phone: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确' }
  ],
  type: [{ required: true, message: '请选择咨询类型' }],
  message: [{ required: true, message: '请输入留言内容' }]
}

const onFinish = () => {
  message.success('提交成功，我们会尽快与你联系')
  formRef.value.resetFields()
}
</script>

<style scoped>
.contact {
  padding: 96px 24px;
}

.contact-card {
  max-width: 640px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .contact {
    padding: 56px 16px;
  }
}
</style>
```
