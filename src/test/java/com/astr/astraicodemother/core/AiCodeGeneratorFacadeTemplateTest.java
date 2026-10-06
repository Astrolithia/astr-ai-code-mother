package com.astr.astraicodemother.core;

import com.astr.astraicodemother.ai.AiCodeGeneratorService;
import com.astr.astraicodemother.ai.AiCodeGeneratorServiceFactory;
import com.astr.astraicodemother.ai.model.HtmlCodeResult;
import com.astr.astraicodemother.ai.model.MultiFileCodeResult;
import com.astr.astraicodemother.core.parser.CodeFileSaverExecutor;
import com.astr.astraicodemother.core.parser.CodeParserExecutor;
import com.astr.astraicodemother.core.template.CodeTemplatePromptEnhancer;
import com.astr.astraicodemother.exception.BusinessException;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.service.TokenStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;

import java.io.File;
import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * 验证 Facade 将增强后的输入交给 AI，且保留原来的解析、保存和应用 ID。
 * 不启动 Spring，不调用真实 AI，也不向应用目录写入文件。
 */
@ExtendWith(MockitoExtension.class)
class AiCodeGeneratorFacadeTemplateTest {

    private static final Long APP_ID = 123L;
    private static final String USER_MESSAGE = "创建一个读书笔记网站";
    private static final String ENHANCED_MESSAGE = "【代码模板参考】测试模板\n【用户需求】" + USER_MESSAGE;

    @Mock
    private AiCodeGeneratorServiceFactory aiCodeGeneratorServiceFactory;

    @Mock
    private AiCodeGeneratorService aiCodeGeneratorService;

    @Mock
    private CodeTemplatePromptEnhancer codeTemplatePromptEnhancer;

    @InjectMocks
    private AiCodeGeneratorFacade facade;

    @ParameterizedTest
    @EnumSource(value = CodeGenTypeEnum.class, names = {"HTML", "MULTI_FILE"})
    @DisplayName("同步入口将增强类返回值传给 AI，并保存原类型的代码结果")
    void synchronousGenerationUsesEnhancedInput(CodeGenTypeEnum codeGenType) {
        String modelInput = prepareGeneration(codeGenType);
        Object codeResult;
        if (codeGenType == CodeGenTypeEnum.HTML) {
            HtmlCodeResult htmlResult = new HtmlCodeResult();
            when(aiCodeGeneratorService.generateCode(modelInput)).thenReturn(htmlResult);
            codeResult = htmlResult;
        } else {
            MultiFileCodeResult multiFileResult = new MultiFileCodeResult();
            when(aiCodeGeneratorService.generateMultiCode(modelInput)).thenReturn(multiFileResult);
            codeResult = multiFileResult;
        }
        File expectedDirectory = new File("mock-output");

        // 模拟保存操作，避免单元测试生成真实应用文件。
        try (MockedStatic<CodeFileSaverExecutor> saver = mockStatic(CodeFileSaverExecutor.class)) {
            saver.when(() -> CodeFileSaverExecutor.executeSaver(codeResult, codeGenType, APP_ID))
                    .thenReturn(expectedDirectory);

            File result = facade.generateAndSaveCode(USER_MESSAGE, codeGenType, APP_ID);

            assertSame(expectedDirectory, result);
            saver.verify(() -> CodeFileSaverExecutor.executeSaver(codeResult, codeGenType, APP_ID));
        }
        if (codeGenType == CodeGenTypeEnum.HTML) {
            verify(aiCodeGeneratorService).generateCode(modelInput);
        } else {
            verify(aiCodeGeneratorService).generateMultiCode(modelInput);
        }
        verify(codeTemplatePromptEnhancer).enhance(USER_MESSAGE, codeGenType);
    }

    @ParameterizedTest
    @EnumSource(value = CodeGenTypeEnum.class, names = {"HTML", "MULTI_FILE"})
    @DisplayName("流式入口使用增强输入，原样返回片段，并解析保存完整响应")
    void streamingGenerationUsesEnhancedInputAndPreservesOutput(CodeGenTypeEnum codeGenType) {
        String modelInput = prepareGeneration(codeGenType);
        List<String> chunks = List.of("```html\n<h1>", "测试页面</h1>\n```");
        if (codeGenType == CodeGenTypeEnum.HTML) {
            when(aiCodeGeneratorService.generateHtmlCodeStream(modelInput))
                    .thenReturn(Flux.fromIterable(chunks));
        } else {
            when(aiCodeGeneratorService.generateMultiCodeStream(modelInput))
                    .thenReturn(Flux.fromIterable(chunks));
        }
        String completeCode = String.join("", chunks);
        Object parsedCode = new Object();
        File expectedDirectory = new File("mock-output");

        try (MockedStatic<CodeParserExecutor> parser = mockStatic(CodeParserExecutor.class);
             MockedStatic<CodeFileSaverExecutor> saver = mockStatic(CodeFileSaverExecutor.class)) {
            parser.when(() -> CodeParserExecutor.executeParser(completeCode, codeGenType))
                    .thenReturn(parsedCode);
            saver.when(() -> CodeFileSaverExecutor.executeSaver(parsedCode, codeGenType, APP_ID))
                    .thenReturn(expectedDirectory);

            List<String> result = facade.generateAndSaveCodeStream(USER_MESSAGE, codeGenType, APP_ID)
                    .collectList()
                    .block(Duration.ofSeconds(5));

            assertEquals(chunks, result);
            parser.verify(() -> CodeParserExecutor.executeParser(completeCode, codeGenType));
            saver.verify(() -> CodeFileSaverExecutor.executeSaver(parsedCode, codeGenType, APP_ID));
        }
        if (codeGenType == CodeGenTypeEnum.HTML) {
            verify(aiCodeGeneratorService).generateHtmlCodeStream(modelInput);
        } else {
            verify(aiCodeGeneratorService).generateMultiCodeStream(modelInput);
        }
        verify(codeTemplatePromptEnhancer).enhance(USER_MESSAGE, codeGenType);
    }

    @Test
    @DisplayName("Vue 流式入口保留无模板时的原始需求及应用 ID")
    void vueGenerationPreservesInputAndAppId() {
        String modelInput = prepareGeneration(CodeGenTypeEnum.VUE_PROJECT);
        TokenStream tokenStream = mock(TokenStream.class);
        when(aiCodeGeneratorService.generateVueProjectCodeStream(modelInput, APP_ID))
                .thenReturn(tokenStream);

        // 这里只验证路由到正确的 AI 方法，不订阅或执行工具调用。
        Flux<String> result = facade.generateAndSaveCodeStream(
                USER_MESSAGE, CodeGenTypeEnum.VUE_PROJECT, APP_ID);

        assertNotNull(result);
        verify(codeTemplatePromptEnhancer).enhance(USER_MESSAGE, CodeGenTypeEnum.VUE_PROJECT);
        verify(aiCodeGeneratorService).generateVueProjectCodeStream(USER_MESSAGE, APP_ID);
        verifyNoInteractions(tokenStream);
    }

    @Test
    @DisplayName("生成类型为空时先报错，不增强输入或调用 AI")
    void rejectsNullTypeBeforeEnhancingInput() {
        assertAll(
                () -> assertThrows(BusinessException.class,
                        () -> facade.generateAndSaveCode(USER_MESSAGE, null, APP_ID)),
                () -> assertThrows(BusinessException.class,
                        () -> facade.generateAndSaveCodeStream(USER_MESSAGE, null, APP_ID))
        );
        verifyNoInteractions(codeTemplatePromptEnhancer,
                aiCodeGeneratorServiceFactory, aiCodeGeneratorService);
    }

    private String prepareGeneration(CodeGenTypeEnum codeGenType) {
        String modelInput = codeGenType == CodeGenTypeEnum.MULTI_FILE
                ? ENHANCED_MESSAGE : USER_MESSAGE;
        when(codeTemplatePromptEnhancer.enhance(USER_MESSAGE, codeGenType)).thenReturn(modelInput);
        when(aiCodeGeneratorServiceFactory.getAiCodeGeneratorService(APP_ID, codeGenType))
                .thenReturn(aiCodeGeneratorService);
        return modelInput;
    }
}
