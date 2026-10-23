package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * Vue 工程模式节点：规划 Vue 项目文件结构（Mock）
 */
@Slf4j
public class VueProjectGeneratorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            log.info("执行节点: Vue 工程模式");
            List<String> plannedFiles = List.of(
                    "package.json",
                    "vite.config.js",
                    "index.html",
                    "src/main.js",
                    "src/App.vue",
                    "src/router/index.js",
                    "src/pages/Home.vue"
            );
            return Map.of(CodeGenWorkflowState.PLANNED_FILES, plannedFiles);
        });
    }
}
