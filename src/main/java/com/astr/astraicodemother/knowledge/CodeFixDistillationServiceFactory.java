package com.astr.astraicodemother.knowledge;

import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.service.AiServices;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 失败修复案例提炼服务工厂
 */
@Configuration
public class CodeFixDistillationServiceFactory {

    @Resource
    private ChatModel chatModel;

    @Bean
    public CodeFixDistillationService codeFixDistillationService() {
        return AiServices.builder(CodeFixDistillationService.class)
                .chatModel(chatModel)
                .build();
    }
}
