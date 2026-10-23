package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 原生多文件模式节点：规划 HTML / CSS / JS 文件结构（Mock）
 */
@Slf4j
public class MultiFileGeneratorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            log.info("执行节点: 原生多文件模式");
            return Map.of(CodeGenWorkflowState.PLANNED_FILES, List.of("index.html", "style.css", "script.js"));
        });
    }
}
