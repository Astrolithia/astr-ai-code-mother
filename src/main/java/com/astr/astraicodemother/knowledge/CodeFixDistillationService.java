package com.astr.astraicodemother.knowledge;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

/**
 * 失败修复案例提炼 AI 服务：从质检错误与修复说明中提炼通用避坑规则
 */
public interface CodeFixDistillationService {

    /**
     * 提炼避坑经验
     *
     * @param context 包含用户需求、质检错误详情和修复思路的上下文
     * @return 提炼后的经验切片
     */
    @SystemMessage(fromResource = "prompt/code-fix-distillation-system-prompt.txt")
    CodeFixExperience distillExperience(@UserMessage String context);
}
