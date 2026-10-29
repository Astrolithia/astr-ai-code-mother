package com.astr.astraicodemother.knowledge;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * 启动后把 classpath 下的知识库文件向量化写入存储。
 * <p>
 * 用 Spring 的资源解析而不是 FileSystemDocumentLoader，打成 jar 后也能读到 classpath 内的文件。
 */
@Component
@Slf4j
public class CodeKnowledgeIngestor {

    private final EmbeddingStore<TextSegment> embeddingStore;
    private final EmbeddingStoreIngestor ingestor;

    @Value("${code-knowledge.location}")
    private String location;

    public CodeKnowledgeIngestor(EmbeddingModel codeKnowledgeEmbeddingModel,
                                 EmbeddingStore<TextSegment> codeKnowledgeEmbeddingStore) {
        this.embeddingStore = codeKnowledgeEmbeddingStore;
        // 不配置 DocumentSplitter：每个文件就是一个完整片段，切开的代码无法使用
        this.ingestor = EmbeddingStoreIngestor.builder()
                .embeddingModel(codeKnowledgeEmbeddingModel)
                .embeddingStore(codeKnowledgeEmbeddingStore)
                .build();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ingest() {
        try {
            List<Document> documents = loadDocuments();
            embeddingStore.removeAll();
            ingestor.ingest(documents);
            log.info("代码知识库入库完成，共 {} 个片段", documents.size());
        } catch (Exception e) {
            // 知识库只是增强，失败时检索返回空结果，不影响代码生成
            log.warn("代码知识库入库失败，本次运行不使用知识库", e);
        }
    }

    private List<Document> loadDocuments() throws IOException {
        Resource[] resources = new PathMatchingResourcePatternResolver().getResources(location);
        List<Document> documents = new ArrayList<>();
        for (Resource resource : resources) {
            String markdown = resource.getContentAsString(StandardCharsets.UTF_8);
            try {
                documents.add(CodeKnowledgeDocumentParser.parse(markdown));
            } catch (IllegalArgumentException e) {
                log.warn("跳过格式错误的知识库文件 {}：{}", resource.getFilename(), e.getMessage());
            }
        }
        return documents;
    }
}
