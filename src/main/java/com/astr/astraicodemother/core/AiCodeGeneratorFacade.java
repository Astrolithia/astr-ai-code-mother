package com.astr.astraicodemother.core;

import cn.hutool.json.JSONUtil;
import com.astr.astraicodemother.ai.AiCodeGeneratorService;
import com.astr.astraicodemother.ai.AiCodeGeneratorServiceFactory;
import com.astr.astraicodemother.ai.model.HtmlCodeResult;
import com.astr.astraicodemother.ai.model.MultiFileCodeResult;
import com.astr.astraicodemother.ai.model.message.AiResponseMessage;
import com.astr.astraicodemother.ai.model.message.ToolExecutedMessage;
import com.astr.astraicodemother.ai.model.message.ToolRequestMessage;
import com.astr.astraicodemother.core.parser.CodeFileSaverExecutor;
import com.astr.astraicodemother.core.parser.CodeParserExecutor;
import com.astr.astraicodemother.core.template.CodeTemplatePromptEnhancer;
import com.astr.astraicodemother.exception.BusinessException;
import com.astr.astraicodemother.exception.ErrorCode;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.service.TokenStream;
import dev.langchain4j.service.tool.ToolExecution;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.io.File;

@Service
@Slf4j
public class AiCodeGeneratorFacade {

    @Resource
    private AiCodeGeneratorServiceFactory aiCodeGeneratorServiceFactory;

    @Resource
    private CodeTemplatePromptEnhancer codeTemplatePromptEnhancer;

    public File generateAndSaveCode(String userMessage, CodeGenTypeEnum codeGenTypeEnum, Long appId) {
        if (codeGenTypeEnum == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "生成类型不能为空");
        }
        // 仅增强模型输入，不修改原始用户消息或后续保存逻辑。
        String enhancedMessage = codeTemplatePromptEnhancer.enhance(userMessage, codeGenTypeEnum);
        // 根据 appId 获取相应的 AI 服务实例
        AiCodeGeneratorService aiCodeGeneratorService = aiCodeGeneratorServiceFactory.getAiCodeGeneratorService(appId, codeGenTypeEnum);
        return switch (codeGenTypeEnum) {
            case HTML -> {
                HtmlCodeResult result = aiCodeGeneratorService.generateCode(enhancedMessage);
                yield CodeFileSaverExecutor.executeSaver(result, CodeGenTypeEnum.HTML, appId);
            }
            case MULTI_FILE -> {
                MultiFileCodeResult result = aiCodeGeneratorService.generateMultiCode(enhancedMessage);
                yield CodeFileSaverExecutor.executeSaver(result, CodeGenTypeEnum.MULTI_FILE, appId);
            }
            default -> {
                String errorMessage = "不支持的生成类型: " + codeGenTypeEnum.getValue();
                throw new BusinessException(ErrorCode.PARAMS_ERROR, errorMessage);
            }
        };
    }

    /**
     * 统一入口：根据类型生成并保存代码（流式）
     *
     * @param userMessage     用户提示词
     * @param codeGenTypeEnum 生成类型
     */
    public Flux<String> generateAndSaveCodeStream(String userMessage, CodeGenTypeEnum codeGenTypeEnum, Long appId) {
        if (codeGenTypeEnum == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "生成类型不能为空");
        }
        String enhancedMessage = codeTemplatePromptEnhancer.enhance(userMessage, codeGenTypeEnum);
        AiCodeGeneratorService aiCodeGeneratorService = aiCodeGeneratorServiceFactory.getAiCodeGeneratorService(appId, codeGenTypeEnum);
        return switch (codeGenTypeEnum) {
            case HTML -> {
                Flux<String> codeStream = aiCodeGeneratorService.generateHtmlCodeStream(enhancedMessage);
                yield processCodeStream(codeStream, CodeGenTypeEnum.HTML, appId);
            }
            case MULTI_FILE -> {
                Flux<String> codeStream = aiCodeGeneratorService.generateMultiCodeStream(enhancedMessage);
                yield processCodeStream(codeStream, CodeGenTypeEnum.MULTI_FILE, appId);
            }
            case VUE_PROJECT -> {
                TokenStream tokenStream = aiCodeGeneratorService.generateVueProjectCodeStream(enhancedMessage, appId);
                yield processTokenStream(tokenStream);
            }
            default -> {
                String errorMessage = "不支持的生成类型: " + codeGenTypeEnum.getValue();
                throw new BusinessException(ErrorCode.PARAMS_ERROR, errorMessage);
            }
        };
    }

    /**
     * 将 TokenStream 转换为 Flux<String>，并传递工具调用信息
     *
     * @param tokenStream TokenStream 对象
     * @return Flux<String> 流式响应
     */
    private Flux<String> processTokenStream(TokenStream tokenStream) {
        return Flux.create(sink -> {
            tokenStream.onPartialResponse((String partialResponse) -> {
                        AiResponseMessage aiResponseMessage = new AiResponseMessage(partialResponse);
                        sink.next(JSONUtil.toJsonStr(aiResponseMessage));
                    })
                    .onPartialToolExecutionRequest((index, toolExecutionRequest) -> {
                        ToolRequestMessage toolRequestMessage = new ToolRequestMessage(toolExecutionRequest);
                        sink.next(JSONUtil.toJsonStr(toolRequestMessage));
                    })
                    .onToolExecuted((ToolExecution toolExecution) -> {
                        ToolExecutedMessage toolExecutedMessage = new ToolExecutedMessage(toolExecution);
                        sink.next(JSONUtil.toJsonStr(toolExecutedMessage));
                    })
                    .onCompleteResponse((ChatResponse response) -> {
                        sink.complete();
                    })
                    .onError((Throwable error) -> {
                        error.printStackTrace();
                        sink.error(error);
                    })
                    .start();
        });
    }


    /**
     * 通用流式代码处理方法
     *
     * @param codeStream  代码流
     * @param codeGenType 代码生成类型
     * @param appId       应用 ID
     * @return 流式响应
     */
    private Flux<String> processCodeStream(Flux<String> codeStream, CodeGenTypeEnum codeGenType, Long appId) {
        // 字符串拼接，用于当流式返回所有代码之后，再保存代码
        StringBuilder codeBuilder = new StringBuilder();
        // 实时收集代码片段
        return codeStream.doOnNext(codeBuilder::append).doOnComplete(() -> {
            try {
                // 流式返回成功后，保存代码
                String completeCode = codeBuilder.toString();
                // 解析代码为对象
                Object parseResult = CodeParserExecutor.executeParser(completeCode, codeGenType);
                // 使用执行器保存代码
                File saveDir = CodeFileSaverExecutor.executeSaver(parseResult, codeGenType, appId);
                log.info("保存成功, 目录为: {}", saveDir.getAbsolutePath());
            } catch (Exception e) {
                log.info("保存失败: {}", e.getMessage());
            }
        });
    }
}
