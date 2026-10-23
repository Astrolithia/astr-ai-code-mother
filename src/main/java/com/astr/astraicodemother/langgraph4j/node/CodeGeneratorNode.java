package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.constant.AppConstant;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 网站生成节点：根据增强提示词和生成模式生成代码（Mock，只给出输出目录）
 */
@Slf4j
public class CodeGeneratorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            log.info("执行节点: 网站生成 Agent，模式: {}，文件数: {}",
                    state.generationType().getText(), state.plannedFiles().size());
            String generatedCodeDir = AppConstant.CODE_OUTPUT_ROOT_DIR + "/" + state.generationType().getValue() + "_mock";
            return Map.of(CodeGenWorkflowState.GENERATED_CODE_DIR, generatedCodeDir);
        });
    }
}
