package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 原生 HTML 模式节点：规划单文件结构（Mock）
 */
@Slf4j
public class HtmlGeneratorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            log.info("执行节点: 原生 HTML 模式");
            return Map.of(CodeGenWorkflowState.PLANNED_FILES, List.of("index.html"));
        });
    }
}
