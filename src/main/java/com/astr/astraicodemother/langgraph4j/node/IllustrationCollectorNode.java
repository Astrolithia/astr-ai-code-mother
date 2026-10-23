package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.collection.CollUtil;
import com.astr.astraicodemother.langgraph4j.model.ImageCollectionPlan;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.langgraph4j.tools.UndrawIllustrationTool;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 插画图片收集节点：unDraw 插画搜索
 */
@Slf4j
public class IllustrationCollectorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            List<ImageCollectionPlan.IllustrationTask> tasks =
                    CollUtil.emptyIfNull(state.imageCollectionPlan().getIllustrationTasks());
            log.info("执行节点: 插画图片收集（unDraw 搜索），任务数: {}", tasks.size());
            List<ImageResource> images = new ArrayList<>();
            if (!tasks.isEmpty()) {
                UndrawIllustrationTool illustrationTool = SpringContextUtil.getBean(UndrawIllustrationTool.class);
                for (ImageCollectionPlan.IllustrationTask task : tasks) {
                    images.addAll(illustrationTool.searchIllustrations(task.query()));
                }
            }
            log.info("插画图片收集完成，共 {} 张", images.size());
            return Map.of(CodeGenWorkflowState.IMAGE_LIST, images);
        });
    }
}
