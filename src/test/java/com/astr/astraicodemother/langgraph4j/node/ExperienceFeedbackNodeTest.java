package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.knowledge.CodeFixDistillationService;
import com.astr.astraicodemother.knowledge.CodeFixExperience;
import com.astr.astraicodemother.knowledge.CodeKnowledgeRetriever;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ExperienceFeedbackNodeTest {

    private MockedStatic<SpringContextUtil> springContextUtilMock;
    private CodeFixDistillationService distillationService;
    private CodeKnowledgeRetriever retriever;

    @BeforeEach
    void setUp() {
        distillationService = mock(CodeFixDistillationService.class);
        retriever = mock(CodeKnowledgeRetriever.class);
        springContextUtilMock = mockStatic(SpringContextUtil.class);
        springContextUtilMock.when(() -> SpringContextUtil.getBean(CodeFixDistillationService.class))
                .thenReturn(distillationService);
        springContextUtilMock.when(() -> SpringContextUtil.getBean(CodeKnowledgeRetriever.class))
                .thenReturn(retriever);
    }

    @AfterEach
    void tearDown() {
        springContextUtilMock.close();
    }

    @Test
    @DisplayName("一次通过无修复历史时不触发经验提炼与回流")
    void skipsWhenNoFixHappened() throws Exception {
        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个官网",
                CodeGenWorkflowState.QUALITY_CHECK_COUNT, 1
        ));

        Map<String, Object> result = ExperienceFeedbackNode.create().apply(state).get();
        Assertions.assertTrue(result.isEmpty());
        verifyNoInteractions(distillationService);
        verifyNoInteractions(retriever);
    }

    @Test
    @DisplayName("经历二次质检且有错误记录时成功提炼并回流向量库")
    void distillsAndIngestsWhenFixOccurred() throws Exception {
        CodeFixExperience mockExp = CodeFixExperience.builder()
                .category("ROUTER_CONFIG")
                .scenario("Vue 项目缺少 router-view")
                .avoidRule("- App.vue 必须使用 <router-view />")
                .reason("子路由无法挂载")
                .build();
        when(distillationService.distillExperience(any())).thenReturn(mockExp);

        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个科技官网",
                CodeGenWorkflowState.GENERATION_TYPE, CodeGenTypeEnum.VUE_PROJECT,
                CodeGenWorkflowState.QUALITY_CHECK_COUNT, 2,
                CodeGenWorkflowState.LAST_FAILED_QUALITY_ERRORS, List.of("页面空白，缺少 router-view 导致无法展示子页面")
        ));

        Map<String, Object> result = ExperienceFeedbackNode.create().apply(state).get();
        Assertions.assertTrue(result.isEmpty());

        ArgumentCaptor<CodeFixExperience> captor = ArgumentCaptor.forClass(CodeFixExperience.class);
        verify(retriever).ingestExperience(captor.capture());
        CodeFixExperience ingested = captor.getValue();

        Assertions.assertNotNull(ingested);
        Assertions.assertEquals("ROUTER_CONFIG", ingested.getCategory());
        Assertions.assertEquals("Vue 项目缺少 router-view", ingested.getScenario());
        Assertions.assertTrue(ingested.getId().startsWith("fix-router_config-"));
        Assertions.assertEquals(CodeGenTypeEnum.VUE_PROJECT, ingested.getCodeGenType());
    }

    @Test
    @DisplayName("提炼服务异常时优雅降级不阻断流程")
    void handlesDistillationExceptionGracefully() throws Exception {
        when(distillationService.distillExperience(any())).thenThrow(new RuntimeException("LLM timeout"));

        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个科技官网",
                CodeGenWorkflowState.QUALITY_CHECK_COUNT, 2,
                CodeGenWorkflowState.LAST_FAILED_QUALITY_ERRORS, List.of("错误 1")
        ));

        Map<String, Object> result = ExperienceFeedbackNode.create().apply(state).get();
        Assertions.assertTrue(result.isEmpty());
    }
}
