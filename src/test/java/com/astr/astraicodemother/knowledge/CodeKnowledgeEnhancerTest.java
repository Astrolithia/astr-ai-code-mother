package com.astr.astraicodemother.knowledge;

import com.astr.astraicodemother.knowledge.CodeKnowledgePlan.SectionQueryTask;
import com.astr.astraicodemother.knowledge.CodeKnowledgeRetriever.CodeKnowledge;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CodeKnowledgeEnhancerTest {

    private CodeKnowledgeRetriever retriever;
    private CodeKnowledgePlanService planService;
    private CodeKnowledgeEnhancer enhancer;

    @BeforeEach
    void setUp() {
        retriever = mock(CodeKnowledgeRetriever.class);
        planService = mock(CodeKnowledgePlanService.class);
        enhancer = new CodeKnowledgeEnhancer(retriever, planService);
    }

    @Test
    @DisplayName("非Vue工程直接返回empty")
    void returnsEmptyForNonVue() {
        Optional<String> result = enhancer.enhanceKnowledge("个人作品集", CodeGenTypeEnum.HTML);
        Assertions.assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("规划并成功检索到风格和组件时格式化结构化提示词")
    void enhancesWithStyleAndComponents() {
        CodeKnowledgePlan plan = CodeKnowledgePlan.builder()
                .styleQuery("简约浅色")
                .sectionTasks(List.of(
                        new SectionQueryTask("navbar", "顶部导航"),
                        new SectionQueryTask("hero", "首屏介绍")
                ))
                .build();
        when(planService.planKnowledge(any())).thenReturn(plan);

        when(retriever.retrieveStyle(eq("简约浅色"), eq(CodeGenTypeEnum.VUE_PROJECT)))
                .thenReturn(Optional.of(new CodeKnowledge("minimal-light", "theme: minimal", 0.85)));

        when(retriever.retrieveComponent(eq("navbar"), any(), eq(CodeGenTypeEnum.VUE_PROJECT)))
                .thenReturn(Optional.of(new CodeKnowledge("vue-navbar-top-menu", "<a-menu>navbar</a-menu>", 0.88)));

        when(retriever.retrieveComponent(eq("hero"), any(), eq(CodeGenTypeEnum.VUE_PROJECT)))
                .thenReturn(Optional.of(new CodeKnowledge("vue-hero-banner", "<a-row>hero</a-row>", 0.82)));

        Optional<String> result = enhancer.enhanceKnowledge("个人作品集网站", CodeGenTypeEnum.VUE_PROJECT);
        Assertions.assertTrue(result.isPresent());
        String text = result.get();
        Assertions.assertTrue(text.contains("代码知识库参考（Ant Design Vue 4.x 最佳实践）"));
        Assertions.assertTrue(text.contains("minimal-light"));
        Assertions.assertTrue(text.contains("vue-navbar-top-menu"));
        Assertions.assertTrue(text.contains("vue-hero-banner"));
        Assertions.assertTrue(text.contains("知识库参考规则"));
    }

    @Test
    @DisplayName("AI规划服务抛出异常时降级使用规则规划")
    void fallbacksWhenPlanServiceThrows() {
        when(planService.planKnowledge(any())).thenThrow(new RuntimeException("LLM timeout"));

        when(retriever.retrieveStyle(any(), eq(CodeGenTypeEnum.VUE_PROJECT)))
                .thenReturn(Optional.of(new CodeKnowledge("minimal-light", "theme: minimal", 0.80)));

        when(retriever.retrieveComponent(eq("navbar"), any(), eq(CodeGenTypeEnum.VUE_PROJECT)))
                .thenReturn(Optional.of(new CodeKnowledge("vue-navbar-top-menu", "<a-menu>navbar</a-menu>", 0.85)));

        Optional<String> result = enhancer.enhanceKnowledge("个人作品集网站，包含导航和介绍", CodeGenTypeEnum.VUE_PROJECT);
        Assertions.assertTrue(result.isPresent());
        String text = result.get();
        Assertions.assertTrue(text.contains("minimal-light"));
        Assertions.assertTrue(text.contains("vue-navbar-top-menu"));
    }

    @Test
    @DisplayName("没有命中任何风格与组件时返回empty")
    void returnsEmptyWhenNoMatches() {
        CodeKnowledgePlan plan = CodeKnowledgePlan.builder()
                .styleQuery("冷门风格")
                .sectionTasks(List.of(new SectionQueryTask("gallery", "相册")))
                .build();
        when(planService.planKnowledge(any())).thenReturn(plan);
        when(retriever.retrieveStyle(any(), any())).thenReturn(Optional.empty());
        when(retriever.retrieveComponent(any(), any(), any())).thenReturn(Optional.empty());

        Optional<String> result = enhancer.enhanceKnowledge("未知需求", CodeGenTypeEnum.VUE_PROJECT);
        Assertions.assertTrue(result.isEmpty());
    }
}
