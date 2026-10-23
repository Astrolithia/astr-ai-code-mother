package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.collection.CollUtil;
import com.astr.astraicodemother.langgraph4j.model.ImageCollectionPlan;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.langgraph4j.tools.ImageSearchTool;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 内容图片收集节点：Pexels 图库搜索
 */
@Slf4j
public class ContentImageCollectorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            List<ImageCollectionPlan.ImageSearchTask> tasks =
                    CollUtil.emptyIfNull(state.imageCollectionPlan().getContentImageTasks());
            log.info("执行节点: 内容图片收集（Pexels 搜索），任务数: {}", tasks.size());
            List<ImageResource> images = new ArrayList<>();
            if (!tasks.isEmpty()) {
                ImageSearchTool imageSearchTool = SpringContextUtil.getBean(ImageSearchTool.class);
                for (ImageCollectionPlan.ImageSearchTask task : tasks) {
                    images.addAll(imageSearchTool.searchContentImages(task.query()));
                }
            }
            log.info("内容图片收集完成，共 {} 张", images.size());
            return Map.of(CodeGenWorkflowState.IMAGE_LIST, images);
        });
    }
}
