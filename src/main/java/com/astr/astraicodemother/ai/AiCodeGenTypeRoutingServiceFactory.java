package com.astr.astraicodemother.ai;

import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AI 代码生成类型路由服务工厂
 */
@Configuration
public class AiCodeGenTypeRoutingServiceFactory {

    @Value("${langchain4j.open-ai.chat-model.base-url}")
    private String baseUrl;

    @Value("${langchain4j.open-ai.chat-model.api-key}")
    private String apiKey;

    @Value("${langchain4j.open-ai.chat-model.model-name}")
    private String modelName;

    @Bean
    public AiCodeGenTypeRoutingService aiCodeGenTypeRoutingService() {
        // 默认 ChatModel 开启了 json_object 输出，而路由只需返回枚举名，因此单独创建一个纯文本模型
        // 不注册为 Bean，避免与默认 ChatModel 按类型注入时冲突
        OpenAiChatModel routingChatModel = OpenAiChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(modelName)
                .maxTokens(20)
                .temperature(0.0)
                .logRequests(true)
                .logResponses(true)
                .build();
        return AiServices.builder(AiCodeGenTypeRoutingService.class)
                .chatModel(routingChatModel)
                .build();
    }
}
