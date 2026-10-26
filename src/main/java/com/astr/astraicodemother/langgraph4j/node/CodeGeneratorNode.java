package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.collection.CollUtil;
import com.astr.astraicodemother.constant.AppConstant;
import com.astr.astraicodemother.core.AiCodeGeneratorFacade;
import com.astr.astraicodemother.langgraph4j.CodeGenWorkflow;
import com.astr.astraicodemother.langgraph4j.model.QualityResult;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeActionWithConfig;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;

import java.io.File;
import java.time.Duration;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeActionWithConfig.node_async;

/**
 * 代码生成节点：按生成模式调用 AI 生成代码并保存到输出目录
 */
@Slf4j
public class CodeGeneratorNode {

    /**
     * Vue 工程模式使用推理模型并多次调用写文件工具，耗时较长
     */
    private static final Duration GENERATE_TIMEOUT = Duration.ofMinutes(10);

    public static AsyncNodeActionWithConfig<CodeGenWorkflowState> create() {
        return node_async((state, config) -> {
            CodeGenTypeEnum generationType = state.generationType();
            Long appId = state.appId();
            log.info("执行节点: 代码生成，模式: {}，appId: {}", generationType.getText(), appId);
            AiCodeGeneratorFacade codeGeneratorFacade = SpringContextUtil.getBean(AiCodeGeneratorFacade.class);
            Flux<String> codeStream = codeGeneratorFacade.generateAndSaveCodeStream(buildUserMessage(state), generationType, appId);
            // 流式执行时把 AI 输出原样转发给调用方
            FluxSink<String> outputSink = CodeGenWorkflow.getOutputSink(config);
            if (outputSink != null) {
                codeStream = codeStream.doOnNext(outputSink::next);
            }
            // 门面在流结束时完成文件保存，这里同步等待
            codeStream.blockLast(GENERATE_TIMEOUT);
            String generatedCodeDir = AppConstant.CODE_OUTPUT_ROOT_DIR + File.separator
                    + generationType.getValue() + "_" + appId;
            log.info("代码生成完成，输出目录: {}", generatedCodeDir);
            // HTML 和多文件模式无需构建，输出目录即为最终产物；Vue 工程模式由构建节点覆盖为 dist 目录
            return Map.of(
                    CodeGenWorkflowState.GENERATED_CODE_DIR, generatedCodeDir,
                    CodeGenWorkflowState.BUILD_RESULT_DIR, generatedCodeDir
            );
        });
    }

    /**
     * 首次生成使用增强提示词；质检未通过时只发送错误修复信息，
     * 对话记忆按 appId 保存了上一轮的需求和代码，AI 可以在此基础上修改
     */
    private static String buildUserMessage(CodeGenWorkflowState state) {
        QualityResult qualityResult = state.qualityResult();
        if (qualityResult == null || !qualityResult.needsFix()) {
            return state.enhancedPrompt();
        }
        log.info("根据质检结果重新生成代码，错误数: {}", qualityResult.getErrors().size());
        StringBuilder fixPrompt = new StringBuilder("## 上次生成的代码存在以下问题，请修复：\n");
        qualityResult.getErrors().forEach(error -> fixPrompt.append("- ").append(error).append("\n"));
        if (CollUtil.isNotEmpty(qualityResult.getSuggestions())) {
            fixPrompt.append("\n## 修复建议：\n");
            qualityResult.getSuggestions().forEach(suggestion -> fixPrompt.append("- ").append(suggestion).append("\n"));
        }
        fixPrompt.append("\n请根据上述问题和建议重新生成完整代码，确保修复所有提到的问题。");
        return fixPrompt.toString();
    }
}
