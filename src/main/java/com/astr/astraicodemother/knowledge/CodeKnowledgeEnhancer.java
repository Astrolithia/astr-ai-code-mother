package com.astr.astraicodemother.knowledge;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.astr.astraicodemother.knowledge.CodeKnowledgePlan.SectionQueryTask;
import com.astr.astraicodemother.knowledge.CodeKnowledgeRetriever.CodeKnowledge;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 代码知识库检索增强服务：
 * 1. 调用 AI 将用户需求拆解为风格描述和各页面区块（navbar/hero/features 等）；
 * 2. 多路检索向量库，按 metadata 过滤与相似度阈值匹配最相关的风格规范与组件参考代码；
 * 3. 组装成结构化的知识库参考提示词片段。
 */
@Service
@Slf4j
public class CodeKnowledgeEnhancer {

    private final CodeKnowledgeRetriever retriever;
    private final CodeKnowledgePlanService planService;

    public CodeKnowledgeEnhancer(CodeKnowledgeRetriever retriever,
                                 CodeKnowledgePlanService planService) {
        this.retriever = retriever;
        this.planService = planService;
    }

    /**
     * 根据用户需求与生成模式检索并组装参考代码知识
     *
     * @param userPrompt  用户原始需求
     * @param codeGenType 生成模式
     * @return 格式化后的知识库参考片段；若未命中任何内容或非 Vue 模式返回 Optional.empty()
     */
    public Optional<String> enhanceKnowledge(String userPrompt, CodeGenTypeEnum codeGenType) {
        if (StrUtil.isBlank(userPrompt) || codeGenType != CodeGenTypeEnum.VUE_PROJECT) {
            return Optional.empty();
        }

        log.info("开始代码知识库检索规划，用户需求: {}", userPrompt);
        CodeKnowledgePlan plan;
        try {
            plan = planService.planKnowledge(userPrompt);
        } catch (Exception e) {
            log.warn("AI 规划知识库检索失败，尝试使用降级规则规划: {}", e.getMessage());
            plan = buildFallbackPlan(userPrompt);
        }

        if (plan == null) {
            return Optional.empty();
        }

        // 1. 检索风格
        Optional<CodeKnowledge> styleKnowledge = Optional.empty();
        if (StrUtil.isNotBlank(plan.getStyleQuery())) {
            styleKnowledge = retriever.retrieveStyle(plan.getStyleQuery(), codeGenType);
        }

        // 2. 检索组件片段
        List<CodeKnowledge> componentKnowledges = new ArrayList<>();
        Set<String> visitedSections = new HashSet<>();
        if (CollUtil.isNotEmpty(plan.getSectionTasks())) {
            for (SectionQueryTask task : plan.getSectionTasks()) {
                if (task == null || StrUtil.isBlank(task.getSection()) || visitedSections.contains(task.getSection())) {
                    continue;
                }
                visitedSections.add(task.getSection());
                String query = StrUtil.isNotBlank(task.getQuery()) ? task.getQuery() : userPrompt;
                Optional<CodeKnowledge> compKnowledge = retriever.retrieveComponent(task.getSection(), query, codeGenType);
                compKnowledge.ifPresent(componentKnowledges::add);
            }
        }

        if (styleKnowledge.isEmpty() && componentKnowledges.isEmpty()) {
            log.info("代码知识库未检索到符合阈值的参考内容");
            return Optional.empty();
        }

        // 3. 组装为提示词片段
        StringBuilder sb = new StringBuilder();
        sb.append("## 代码知识库参考（Ant Design Vue 4.x 最佳实践）\n\n");
        sb.append("以下为知识库根据你的需求语义检索出的设计规范与组件参考代码，请在实现时参考：\n\n");

        if (styleKnowledge.isPresent()) {
            sb.append("### 1. 页面视觉风格与主题配置规范 (").append(styleKnowledge.get().id()).append(")\n");
            sb.append(styleKnowledge.get().content().trim()).append("\n\n");
        }

        if (!componentKnowledges.isEmpty()) {
            sb.append("### 2. 推荐组件实现参考 (Components)\n");
            sb.append("以下为相关区块在 Ant Design Vue 下的规范实现，请根据用户实际业务需求丰富文案、配色与数据：\n\n");
            for (int i = 0; i < componentKnowledges.size(); i++) {
                CodeKnowledge ck = componentKnowledges.get(i);
                sb.append("#### 参考 ").append(i + 1).append("：").append(ck.id()).append("\n");
                sb.append(ck.content().trim()).append("\n\n");
            }
        }

        sb.append("### 知识库参考规则\n");
        sb.append("1. 系统提示词中的技术栈、组件库（Ant Design Vue 4.x）和硬约束规则具有最高优先级。\n");
        sb.append("2. 知识库代码仅作为骨架和设计范例参考，必须根据用户的具体业务文案、颜色和布局进行定制，严禁生搬硬套。\n");
        sb.append("3. 确保最终产出完整应用，包含所有必需的组件注册与配置。\n");

        log.info("代码知识库检索增强完成，命中风格: {}，组件数: {}",
                styleKnowledge.map(CodeKnowledge::id).orElse("无"),
                componentKnowledges.size());
        return Optional.of(sb.toString());
    }

    /**
     * 当规划 AI 服务不可用时的规则降级
     */
    private CodeKnowledgePlan buildFallbackPlan(String userPrompt) {
        CodeKnowledgePlan plan = new CodeKnowledgePlan();
        plan.setStyleQuery(userPrompt);
        List<SectionQueryTask> tasks = new ArrayList<>();
        tasks.add(new SectionQueryTask("navbar", "顶部导航栏，包含菜单和操作按钮"));
        tasks.add(new SectionQueryTask("hero", userPrompt));
        if (userPrompt.contains("功能") || userPrompt.contains("特性") || userPrompt.contains("卖点") || userPrompt.contains("介绍")) {
            tasks.add(new SectionQueryTask("features", userPrompt));
        }
        if (userPrompt.contains("价格") || userPrompt.contains("套餐") || userPrompt.contains("会员") || userPrompt.contains("订阅") || userPrompt.contains("收费")) {
            tasks.add(new SectionQueryTask("pricing", userPrompt));
        }
        if (userPrompt.contains("联系") || userPrompt.contains("预约") || userPrompt.contains("表单") || userPrompt.contains("咨询") || userPrompt.contains("留言")) {
            tasks.add(new SectionQueryTask("contact", userPrompt));
        }
        tasks.add(new SectionQueryTask("footer", "网站底部版权和联系信息"));
        plan.setSectionTasks(tasks);
        return plan;
    }
}
