package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 文件保存节点：把计划生成的文件写入代码目录（Mock，只返回文件路径）
 */
@Slf4j
public class FileSaverNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            List<String> savedFiles = state.plannedFiles().stream()
                    .map(file -> state.generatedCodeDir() + "/" + file)
                    .toList();
            log.info("执行节点: 文件保存，共保存 {} 个文件", savedFiles.size());
            return Map.of(CodeGenWorkflowState.SAVED_FILES, savedFiles);
        });
    }
}
