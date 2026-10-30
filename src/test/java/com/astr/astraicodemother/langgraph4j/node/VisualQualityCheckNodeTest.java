package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.langgraph4j.visual.VisualQualityChecker;
import com.astr.astraicodemother.langgraph4j.visual.VisualQualityResult;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

import java.io.File;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class VisualQualityCheckNodeTest {

    private MockedStatic<SpringContextUtil> springContextUtilMock;
    private VisualQualityChecker checker;

    @BeforeEach
    void setUp() {
        checker = mock(VisualQualityChecker.class);
        springContextUtilMock = mockStatic(SpringContextUtil.class);
        springContextUtilMock.when(() -> SpringContextUtil.getBean(VisualQualityChecker.class))
                .thenReturn(checker);
    }

    @AfterEach
    void tearDown() {
        springContextUtilMock.close();
    }

    @Test
    @DisplayName("非Vue工程模式跳过视觉检测")
    void skipsNonVueProjects() throws Exception {
        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.GENERATION_TYPE, CodeGenTypeEnum.HTML
        ));

        Map<String, Object> result = VisualQualityCheckNode.create().apply(state).get();
        Assertions.assertTrue(result.isEmpty());
        verifyNoInteractions(checker);
    }

    @Test
    @DisplayName("无头渲染发现遮挡缺陷时将错误更新进状态打回重修")
    void interceptsVisualDefects() throws Exception {
        String testDist = new File("src/test/resources/mock-dist").getAbsolutePath();
        VisualQualityResult mockResult = VisualQualityResult.builder()
                .isValid(false)
                .visualErrors(List.of("元素发生异常重叠遮挡"))
                .suggestions(List.of("增加 margin 间距"))
                .build();
        when(checker.inspect(any(), any())).thenReturn(mockResult);

        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.GENERATION_TYPE, CodeGenTypeEnum.VUE_PROJECT,
                CodeGenWorkflowState.BUILD_RESULT_DIR, "/Users/shiro/Documents/Developer/astr-ai-code-mother/tmp/code_output/vue_project_473697843824226304/dist"
        ));

        Map<String, Object> result = VisualQualityCheckNode.create().apply(state).get();
        Assertions.assertTrue(result.containsKey(CodeGenWorkflowState.QUALITY_RESULT));
        Assertions.assertTrue(result.containsKey(CodeGenWorkflowState.LAST_FAILED_QUALITY_ERRORS));
    }
}
