package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.ai.ImageCollectionPlanService;
import com.astr.astraicodemother.langgraph4j.model.ImageCollectionPlan;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 图片素材收集节点：由 AI 制定图片收集计划，再分发到四类图片收集节点并行执行
 */
@Slf4j
public class ImageCollectorNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            log.info("执行节点: 图片收集规划，原始提示词: {}", state.originalPrompt());
            // 失败时由工作流的重试钩子重试，最终失败降级为空计划
            ImageCollectionPlanService planService = SpringContextUtil.getBean(ImageCollectionPlanService.class);
            ImageCollectionPlan plan = planService.planImageCollection(state.originalPrompt());
            log.info("图片收集计划: {}", plan);
            return Map.of(CodeGenWorkflowState.IMAGE_COLLECTION_PLAN, plan);
        });
    }
}
