package com.astr.astraicodemother.knowledge;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.Metadata;

import java.util.Arrays;
import java.util.stream.Collectors;

import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.CONTENT;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.DESCRIPTION;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.ID;
import static com.astr.astraicodemother.knowledge.CodeKnowledgeMetadata.TAGS;

/**
 * 把知识库 md 文件解析为 Document：frontmatter 进 metadata，description + tags 作为向量化文本。
 * <p>
 * 代码本身的向量语义很差，所以不参与向量化，只放在 metadata 里随检索结果返回。
 */
public final class CodeKnowledgeDocumentParser {

    private static final String FRONTMATTER_DELIMITER = "---";

    private CodeKnowledgeDocumentParser() {
    }

    public static Document parse(String markdown) {
        String text = markdown.replace("\r\n", "\n").strip();
        if (!text.startsWith(FRONTMATTER_DELIMITER + "\n")) {
            throw new IllegalArgumentException("知识库文件缺少 frontmatter");
        }
        int end = text.indexOf("\n" + FRONTMATTER_DELIMITER, FRONTMATTER_DELIMITER.length());
        if (end < 0) {
            throw new IllegalArgumentException("知识库文件 frontmatter 未闭合");
        }

        Metadata metadata = new Metadata();
        String frontmatter = text.substring(FRONTMATTER_DELIMITER.length() + 1, end);
        for (String line : frontmatter.split("\n")) {
            int colon = line.indexOf(':');
            if (colon <= 0) {
                continue;
            }
            String key = line.substring(0, colon).strip();
            String value = line.substring(colon + 1).strip();
            // metadata 不支持列表，[a, b] 统一转成逗号分隔字符串
            if (value.startsWith("[") && value.endsWith("]")) {
                value = Arrays.stream(value.substring(1, value.length() - 1).split(","))
                        .map(String::strip)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.joining(","));
            }
            metadata.put(key, value);
        }

        String description = metadata.getString(DESCRIPTION);
        if (metadata.getString(ID) == null || description == null || description.isBlank()) {
            throw new IllegalArgumentException("知识库文件 frontmatter 必须包含 id 和 description");
        }
        metadata.put(CONTENT, text.substring(end + FRONTMATTER_DELIMITER.length() + 1).strip());

        String embeddingText = description;
        String tags = metadata.getString(TAGS);
        if (tags != null && !tags.isBlank()) {
            embeddingText += "\n关键词：" + tags.replace(",", "、");
        }
        return Document.from(embeddingText, metadata);
    }
}
