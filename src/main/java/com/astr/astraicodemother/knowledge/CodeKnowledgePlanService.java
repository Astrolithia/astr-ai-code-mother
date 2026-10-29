package com.astr.astraicodemother.knowledge;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

/**
 * 知识库检索规划 AI 服务
 */
public interface CodeKnowledgePlanService {

    /**
     * 根据用户原始需求规划风格和需要检索的页面区块
     *
     * @param userPrompt 用户需求描述
     * @return 检索规划
     */
    @SystemMessage(fromResource = "prompt/code-knowledge-plan-system-prompt.txt")
    CodeKnowledgePlan planKnowledge(@UserMessage String userPrompt);
}
