package com.astr.astraicodemother.langgraph4j.ai;

import com.astr.astraicodemother.langgraph4j.model.QualityResult;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

/**
 * 代码质量检查服务
 */
public interface CodeQualityCheckService {

    /**
     * 检查生成代码能否正常运行和打包
     *
     * @param codeContent 拼接后的项目文件结构和代码内容
     * @return 质检结果
     */
    @SystemMessage(fromResource = "prompt/code-quality-check-system-prompt.txt")
    QualityResult checkCodeQuality(@UserMessage String codeContent);
}
