package com.astr.astraicodemother.langgraph4j.ai;

import com.astr.astraicodemother.langgraph4j.model.ImageCollectionPlan;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

/**
 * 图片收集规划服务
 */
public interface ImageCollectionPlanService {

    /**
     * 根据用户需求规划需要收集的图片类型和参数
     *
     * @param userPrompt 用户原始提示词
     * @return 图片收集计划
     */
    @SystemMessage(fromResource = "prompt/image-collection-plan-system-prompt.txt")
    ImageCollectionPlan planImageCollection(@UserMessage String userPrompt);
}
