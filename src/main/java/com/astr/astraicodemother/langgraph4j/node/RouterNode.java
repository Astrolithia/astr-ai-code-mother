package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 智能路由节点：选择代码生成模式（Mock，固定选择 Vue 工程模式）
 */
@Slf4j
public class RouterNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            CodeGenTypeEnum generationType = CodeGenTypeEnum.VUE_PROJECT;
            log.info("执行节点: 智能路由 Agent，选择生成模式: {}", generationType.getText());
            return Map.of(CodeGenWorkflowState.GENERATION_TYPE, generationType);
        });
    }
}
