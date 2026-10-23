package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.collection.CollUtil;
import com.astr.astraicodemother.langgraph4j.model.ImageCollectionPlan;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.langgraph4j.tools.MermaidDiagramTool;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 架构图收集节点：Mermaid 渲染 + 上传到对象存储
 */
@Slf4j
public class DiagramCollectorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            List<ImageCollectionPlan.DiagramTask> tasks =
                    CollUtil.emptyIfNull(state.imageCollectionPlan().getDiagramTasks());
            log.info("执行节点: 架构图收集（Mermaid 渲染），任务数: {}", tasks.size());
            List<ImageResource> images = new ArrayList<>();
            if (!tasks.isEmpty()) {
                MermaidDiagramTool diagramTool = SpringContextUtil.getBean(MermaidDiagramTool.class);
                for (ImageCollectionPlan.DiagramTask task : tasks) {
                    images.addAll(diagramTool.generateMermaidDiagram(task.mermaidCode(), task.description()));
                }
            }
            log.info("架构图收集完成，共 {} 张", images.size());
            return Map.of(CodeGenWorkflowState.IMAGE_LIST, images);
        });
    }
}
