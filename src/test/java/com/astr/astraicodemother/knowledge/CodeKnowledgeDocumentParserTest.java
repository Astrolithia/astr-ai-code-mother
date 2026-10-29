package com.astr.astraicodemother.knowledge;

import dev.langchain4j.data.document.Document;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CodeKnowledgeDocumentParserTest {

    private static final String MARKDOWN = """
            ---
            type: component
            id: vue-navbar-top-menu
            section: navbar
            tags: [导航栏, 顶部导航 ,菜单]
            description: 网站顶部导航栏
            ---
            ## 使用规则

            ```vue
            <template><a-menu /></template>
            ```
            """;

    @Test
    @DisplayName("frontmatter 进 metadata，description 加关键词作为向量化文本，正文进 content")
    void parsesFrontmatterAndBody() {
        Document document = CodeKnowledgeDocumentParser.parse(MARKDOWN);

        assertAll(
                () -> assertEquals("网站顶部导航栏\n关键词：导航栏、顶部导航、菜单", document.text()),
                () -> assertEquals("component", document.metadata().getString("type")),
                () -> assertEquals("navbar", document.metadata().getString("section")),
                () -> assertEquals("导航栏,顶部导航,菜单", document.metadata().getString("tags")),
                () -> assertEquals("## 使用规则\n\n```vue\n<template><a-menu /></template>\n```",
                        document.metadata().getString("content"))
        );
    }

    @Test
    @DisplayName("Windows 换行的文件也能解析")
    void parsesCrlf() {
        Document document = CodeKnowledgeDocumentParser.parse(MARKDOWN.replace("\n", "\r\n"));

        assertFalse(document.metadata().getString("content").contains("\r"));
    }

    @Test
    @DisplayName("缺少 frontmatter、未闭合或缺少必填字段时报错")
    void rejectsInvalidFiles() {
        assertAll(
                () -> assertThrows(IllegalArgumentException.class,
                        () -> CodeKnowledgeDocumentParser.parse("## 没有 frontmatter")),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> CodeKnowledgeDocumentParser.parse("---\nid: a\ndescription: b\n正文")),
                () -> assertThrows(IllegalArgumentException.class,
                        () -> CodeKnowledgeDocumentParser.parse("---\nid: a\n---\n正文"))
        );
    }
}
