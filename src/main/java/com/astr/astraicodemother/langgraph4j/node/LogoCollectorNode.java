package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.collection.CollUtil;
import com.astr.astraicodemother.langgraph4j.model.ImageCollectionPlan;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.langgraph4j.tools.LogoGeneratorTool;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * Logo 收集节点：AI 文生图 + 上传到对象存储
 */
@Slf4j
public class LogoCollectorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            List<ImageCollectionPlan.LogoTask> tasks =
                    CollUtil.emptyIfNull(state.imageCollectionPlan().getLogoTasks());
            log.info("执行节点: Logo 收集（AI 文生图），任务数: {}", tasks.size());
            List<ImageResource> images = new ArrayList<>();
            if (!tasks.isEmpty()) {
                LogoGeneratorTool logoTool = SpringContextUtil.getBean(LogoGeneratorTool.class);
                for (ImageCollectionPlan.LogoTask task : tasks) {
                    images.addAll(logoTool.generateLogos(task.description()));
                }
            }
            log.info("Logo 收集完成，共 {} 张", images.size());
            return Map.of(CodeGenWorkflowState.IMAGE_LIST, images);
        });
    }
}
