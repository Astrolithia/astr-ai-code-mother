package com.astr.astraicodemother.knowledge;

import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingMatch;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.filter.Filter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.CODE_GEN_TYPE;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.CONTENT;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.ID;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.SECTION;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TYPE;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TYPE_COMPONENT;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TYPE_STYLE;
import static dev.langchain4j.store.embedding.filter.MetadataFilterBuilder.metadataKey;

/**
 * 代码知识库检索：metadata 过滤先缩小范围，再按向量相似度取最相关的一条。
 * <p>
 * 没有用 AiServices 的 contentRetriever 自动注入：自动注入会拿每条用户消息原文检索，
 * 而这里需要按风格、按页面区块分别检索，过滤条件也随调用变化。
 */
@Component
@Slf4j
public class CodeKnowledgeRetriever {

    private final EmbeddingModel embeddingModel;
    private final EmbeddingStore<TextSegment> embeddingStore;

    @Value("${code-knowledge.min-score}")
    private double minScore;

    public CodeKnowledgeRetriever(EmbeddingModel codeKnowledgeEmbeddingModel,
                                  EmbeddingStore<TextSegment> codeKnowledgeEmbeddingStore) {
        this.embeddingModel = codeKnowledgeEmbeddingModel;
        this.embeddingStore = codeKnowledgeEmbeddingStore;
    }

    /**
     * 按风格描述检索风格包，例如"温暖复古的咖啡店"
     */
    public Optional<CodeKnowledge> retrieveStyle(String styleQuery, CodeGenTypeEnum codeGenType) {
        Filter filter = metadataKey(TYPE).isEqualTo(TYPE_STYLE)
                .and(metadataKey(CODE_GEN_TYPE).isEqualTo(codeGenType.getValue()));
        return search(styleQuery, filter);
    }

    /**
     * 在指定页面区块（navbar、hero、pricing 等）内检索组件片段
     */
    public Optional<CodeKnowledge> retrieveComponent(String section, String query, CodeGenTypeEnum codeGenType) {
        Filter filter = metadataKey(TYPE).isEqualTo(TYPE_COMPONENT)
                .and(metadataKey(SECTION).isEqualTo(section))
                .and(metadataKey(CODE_GEN_TYPE).isEqualTo(codeGenType.getValue()));
        return search(query, filter);
    }

    private Optional<CodeKnowledge> search(String query, Filter filter) {
        if (query == null || query.isBlank()) {
            return Optional.empty();
        }
        try {
            Embedding queryEmbedding = embeddingModel.embed(query).content();
            List<EmbeddingMatch<TextSegment>> matches = embeddingStore.search(EmbeddingSearchRequest.builder()
                    .queryEmbedding(queryEmbedding)
                    .filter(filter)
                    .maxResults(1)
                    .minScore(minScore)
                    .build()).matches();
            if (matches.isEmpty()) {
                log.info("知识库未命中，查询：{}", query);
                return Optional.empty();
            }
            EmbeddingMatch<TextSegment> match = matches.get(0);
            CodeKnowledge knowledge = new CodeKnowledge(
                    match.embedded().metadata().getString(ID),
                    match.embedded().metadata().getString(CONTENT),
                    match.score());
            log.info("知识库命中 {}，相似度 {}，查询：{}", knowledge.id(), String.format("%.3f", knowledge.score()), query);
            return Optional.of(knowledge);
        } catch (Exception e) {
            log.warn("知识库检索失败，查询：{}", query, e);
            return Optional.empty();
        }
    }

    public record CodeKnowledge(String id, String content, double score) {
    }
}
