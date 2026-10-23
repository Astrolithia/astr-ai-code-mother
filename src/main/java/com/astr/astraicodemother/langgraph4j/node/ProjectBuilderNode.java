package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 项目构建器节点：分发到文件保存和打包构建节点
 */
@Slf4j
public class ProjectBuilderNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            log.info("执行节点: 项目构建器，代码目录: {}", state.generatedCodeDir());
            return Map.of();
        });
    }
}
