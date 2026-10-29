package com.astr.astraicodemother.knowledge;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 知识库检索规划服务工厂
 */
@Configuration
public class CodeKnowledgePlanServiceFactory {

    @Resource
    private ChatModel chatModel;

    @Bean
    public CodeKnowledgePlanService codeKnowledgePlanService() {
        return AiServices.builder(CodeKnowledgePlanService.class)
                .chatModel(chatModel)
                .build();
    }
}
