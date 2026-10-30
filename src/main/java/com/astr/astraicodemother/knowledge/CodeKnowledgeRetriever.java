package com.astr.astraicodemother.knowledge;

import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.data.document.Metadata;
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.CATEGORY;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.CODE_GEN_TYPE;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.CONTENT;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.DESCRIPTION;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.ID;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.SECTION;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TYPE;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TYPE_COMPONENT;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TYPE_ERROR_FIX;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TYPE_STYLE;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.UI_LIB;
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

    /**
     * 检索与用户需求相关的避坑经验指南 (最多取 top-k 条，例如 top 2)
     */
    public List<CodeKnowledge> retrieveErrorFixes(String userQuery, CodeGenTypeEnum codeGenType, int maxResults) {
        Filter filter = metadataKey(TYPE).isEqualTo(TYPE_ERROR_FIX)
                .and(metadataKey(CODE_GEN_TYPE).isEqualTo(codeGenType.getValue()));
        return searchMulti(userQuery, filter, maxResults);
    }

    /**
     * 动态将一条质检修复经验切片向量化并写入向量库
     */
    public void ingestExperience(CodeFixExperience experience) {
        if (experience == null || experience.getScenario() == null || experience.getAvoidRule() == null) {
            return;
        }
        try {
            Metadata metadata = new Metadata();
            metadata.put(ID, experience.getId());
            metadata.put(TYPE, TYPE_ERROR_FIX);
            metadata.put(CATEGORY, experience.getCategory() != null ? experience.getCategory() : "GENERAL");
            metadata.put(CODE_GEN_TYPE, experience.getCodeGenType() != null ? experience.getCodeGenType().getValue() : CodeGenTypeEnum.VUE_PROJECT.getValue());
            metadata.put(UI_LIB, experience.getUiLib() != null ? experience.getUiLib() : "ant-design-vue");
            metadata.put(DESCRIPTION, experience.getScenario());
            // 组装注入内容：包含踩坑原因与明确的规避规则
            String content = "#### 避坑指南：" + experience.getScenario() + "\n"
                    + "**踩坑原因**：" + experience.getReason() + "\n"
                    + "**规避规则 (Do & Don't)**：\n" + experience.getAvoidRule();
            metadata.put(CONTENT, content);

            // 用 scenario（场景描述）做向量化，保证语义相关度最高
            TextSegment segment = TextSegment.from(experience.getScenario(), metadata);
            Embedding embedding = embeddingModel.embed(segment).content();
            embeddingStore.add(embedding, segment);

            log.info("质检避坑经验已成功沉淀并写入向量库，id: {}, 分类: {}", experience.getId(), experience.getCategory());
        } catch (Exception e) {
            log.error("避坑经验写入向量库失败，id: {}", experience.getId(), e);
        }
    }

    private List<CodeKnowledge> searchMulti(String query, Filter filter, int maxResults) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }
        try {
            Embedding queryEmbedding = embeddingModel.embed(query).content();
            List<EmbeddingMatch<TextSegment>> matches = embeddingStore.search(EmbeddingSearchRequest.builder()
                    .queryEmbedding(queryEmbedding)
                    .filter(filter)
                    .maxResults(maxResults)
                    .minScore(minScore)
                    .build()).matches();
            if (matches.isEmpty()) {
                return Collections.emptyList();
            }
            List<CodeKnowledge> result = new ArrayList<>();
            for (EmbeddingMatch<TextSegment> match : matches) {
                CodeKnowledge knowledge = new CodeKnowledge(
                        match.embedded().metadata().getString(ID),
                        match.embedded().metadata().getString(CONTENT),
                        match.score());
                log.info("知识库命中避坑指南 {}，相似度 {}，查询：{}", knowledge.id(), String.format("%.3f", knowledge.score()), query);
                result.add(knowledge);
            }
            return result;
        } catch (Exception e) {
            log.warn("知识库避坑指南检索失败，查询：{}", query, e);
            return Collections.emptyList();
        }
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
