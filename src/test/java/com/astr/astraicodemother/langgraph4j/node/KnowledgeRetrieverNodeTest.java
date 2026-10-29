package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.knowledge.CodeKnowledgeEnhancer;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

class KnowledgeRetrieverNodeTest {

    private MockedStatic<SpringContextUtil> springContextUtilMock;
    private CodeKnowledgeEnhancer enhancer;

    @BeforeEach
    void setUp() {
        enhancer = mock(CodeKnowledgeEnhancer.class);
        springContextUtilMock = mockStatic(SpringContextUtil.class);
        springContextUtilMock.when(() -> SpringContextUtil.getBean(CodeKnowledgeEnhancer.class))
                .thenReturn(enhancer);
    }

    @AfterEach
    void tearDown() {
        springContextUtilMock.close();
    }

    @Test
    @DisplayName("Vue工程模式命中知识库时拼接到enhancedPrompt")
    void enhancesPromptForVueProject() throws Exception {
        when(enhancer.enhanceKnowledge(eq("做一个科技感后台"), eq(CodeGenTypeEnum.VUE_PROJECT)))
                .thenReturn(Optional.of("## 代码知识库参考\ntech-dark"));

        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个科技感后台",
                CodeGenWorkflowState.ENHANCED_PROMPT, "做一个科技感后台\n\n## 可用素材资源",
                CodeGenWorkflowState.GENERATION_TYPE, CodeGenTypeEnum.VUE_PROJECT
        ));

        Map<String, Object> result = KnowledgeRetrieverNode.create().apply(state).get();
        Assertions.assertTrue(result.containsKey(CodeGenWorkflowState.ENHANCED_PROMPT));
        String enhanced = (String) result.get(CodeGenWorkflowState.ENHANCED_PROMPT);
        Assertions.assertTrue(enhanced.contains("## 可用素材资源"));
        Assertions.assertTrue(enhanced.contains("## 代码知识库参考\ntech-dark"));
    }

    @Test
    @DisplayName("非Vue工程模式直接跳过不检索")
    void skipsForNonVueProjects() throws Exception {
        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个单页HTML",
                CodeGenWorkflowState.ENHANCED_PROMPT, "做一个单页HTML",
                CodeGenWorkflowState.GENERATION_TYPE, CodeGenTypeEnum.HTML
        ));

        Map<String, Object> result = KnowledgeRetrieverNode.create().apply(state).get();
        Assertions.assertTrue(result.isEmpty());
        Mockito.verifyNoInteractions(enhancer);
    }

    @Test
    @DisplayName("检索异常时优雅降级返回空Map")
    void handlesExceptionGracefully() throws Exception {
        when(enhancer.enhanceKnowledge(any(), any()))
                .thenThrow(new RuntimeException("Embedding model error"));

        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个科技感后台",
                CodeGenWorkflowState.GENERATION_TYPE, CodeGenTypeEnum.VUE_PROJECT
        ));

        Map<String, Object> result = KnowledgeRetrieverNode.create().apply(state).get();
        Assertions.assertTrue(result.isEmpty());
    }
}
