package com.astr.astraicodemother.knowledge;

import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 代码质检失败案例修复经验切片：
 * 记录踩坑场景、根因分析与高优先级避坑规则，用于沉淀回流至向量库并在后续生成时提前注入防御。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeFixExperience implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 唯一标识，例如：fix-antdv-router-view-missing-171928374
     */
    private String id;

    /**
     * 错误分类标签，例如：ROUTER_CONFIG, ICON_IMPORT, FORM_VALIDATION, THEME_TOKEN, COMPONENT_USAGE
     */
    private String category;

    /**
     * 踩坑场景摘要（用于生成向量 Embedding）：描述在什么业务/功能场景下容易发生该错误
     * 例如："Ant Design Vue 4.x 路由配置缺少 router-view 导致页面空白"
     */
    private String scenario;

    /**
     * 踩坑原因分析（简明扼要，1-2 句话）
     */
    private String reason;

    /**
     * 核心避坑指南 (Do & Don't)：提炼出的明确规则，直接注入到后续 Prompt 中作为最高约束
     * 例如："- App.vue 必须使用 <router-view /> 承载子页面\n- main.js 必须在 mount 之前 use(router)"
     */
    private String avoidRule;

    /**
     * 相关标签，用于辅助过滤与检索
     */
    private List<String> tags;

    /**
     * 适用的生成模式与组件库
     */
    private CodeGenTypeEnum codeGenType;
    private String uiLib;

    /**
     * 发生时间戳
     */
    private Long createTime;
}
