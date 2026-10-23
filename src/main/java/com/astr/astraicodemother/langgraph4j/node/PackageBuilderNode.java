package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 打包构建节点：Vue 工程输出 dist 目录，其余模式直接使用代码目录（Mock）
 */
@Slf4j
public class PackageBuilderNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            String buildResultDir = state.generationType() == CodeGenTypeEnum.VUE_PROJECT
                    ? state.generatedCodeDir() + "/dist"
                    : state.generatedCodeDir();
            log.info("执行节点: 打包构建，产物目录: {}", buildResultDir);
            return Map.of(CodeGenWorkflowState.BUILD_RESULT_DIR, buildResultDir);
        });
    }
}
