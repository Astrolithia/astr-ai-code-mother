package com.astr.astraicodemother.ai;

import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.service.SystemMessage;

/**
 * AI 代码生成类型路由服务
 */
public interface AiCodeGenTypeRoutingService {

    /**
     * 根据用户需求选择代码生成类型
     *
     * @param userPrompt 用户需求描述
     * @return 推荐的代码生成类型
     */
    @SystemMessage(fromResource = "prompt/codegen-routing-system-prompt.txt")
    CodeGenTypeEnum routeCodeGenType(String userPrompt);
}
