package com.astr.astraicodemother.config;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 代码知识库的向量模型与向量存储
 */
@Configuration
public class CodeKnowledgeConfig {

    // DashScope 兼容接口单批最多接收 10 条文本
    private static final int MAX_SEGMENTS_PER_BATCH = 10;

    @Value("${dashscope.api-key}")
    private String apiKey;

    @Value("${dashscope.compatible-base-url}")
    private String baseUrl;

    @Value("${dashscope.embedding-model}")
    private String embeddingModelName;

    @Bean
    public EmbeddingModel codeKnowledgeEmbeddingModel() {
        return OpenAiEmbeddingModel.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .modelName(embeddingModelName)
                .maxSegmentsPerBatch(MAX_SEGMENTS_PER_BATCH)
                .build();
    }

    /**
     * 知识库规模在百条以内，先用内存存储，启动时重新入库
     */
    @Bean
    public EmbeddingStore<TextSegment> codeKnowledgeEmbeddingStore() {
        return new InMemoryEmbeddingStore<>();
    }
}
