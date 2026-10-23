package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.constant.AppConstant;
import com.astr.astraicodemother.core.AiCodeGeneratorFacade;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.io.File;
import java.time.Duration;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 代码生成节点：按生成模式调用 AI 生成代码并保存到输出目录
 */
@Slf4j
public class CodeGeneratorNode {

    /**
     * Vue 工程模式使用推理模型并多次调用写文件工具，耗时较长
     */
    private static final Duration GENERATE_TIMEOUT = Duration.ofMinutes(10);

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            CodeGenTypeEnum generationType = state.generationType();
            Long appId = state.appId();
            log.info("执行节点: 代码生成，模式: {}，appId: {}", generationType.getText(), appId);
            AiCodeGeneratorFacade codeGeneratorFacade = SpringContextUtil.getBean(AiCodeGeneratorFacade.class);
            // 门面在流结束时完成文件保存，这里同步等待
            codeGeneratorFacade.generateAndSaveCodeStream(state.enhancedPrompt(), generationType, appId)
                    .blockLast(GENERATE_TIMEOUT);
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
}
