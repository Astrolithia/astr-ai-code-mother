package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.core.builder.VueProjectBuilder;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.io.File;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 项目构建节点：仅 Vue 工程模式进入，执行 npm install 和 npm run build
 */
@Slf4j
public class ProjectBuilderNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            String generatedCodeDir = state.generatedCodeDir();
            log.info("执行节点: 项目构建，代码目录: {}", generatedCodeDir);
            VueProjectBuilder vueProjectBuilder = SpringContextUtil.getBean(VueProjectBuilder.class);
            if (!vueProjectBuilder.buildProject(generatedCodeDir)) {
                // 构建失败时保留源码目录作为产物，便于排查
                log.error("Vue 项目构建失败，产物目录保持为源码目录: {}", generatedCodeDir);
                return Map.of();
            }
            String buildResultDir = generatedCodeDir + File.separator + "dist";
            log.info("Vue 项目构建成功，产物目录: {}", buildResultDir);
            return Map.of(CodeGenWorkflowState.BUILD_RESULT_DIR, buildResultDir);
        });
    }
}
