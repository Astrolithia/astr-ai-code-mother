package com.astr.astraicodemother.knowledge;

/**
 * 知识库片段的 metadata 键，与 md 文件 frontmatter 字段一致
 */
public final class CodeKnowledgeMetadata {

    public static final String TYPE = "type";
    public static final String ID = "id";
    public static final String SECTION = "section";
    public static final String CODE_GEN_TYPE = "codeGenType";
    public static final String UI_LIB = "uiLib";
    public static final String TAGS = "tags";
    public static final String DESCRIPTION = "description";
    /**
     * frontmatter 之后的正文（使用规则 + 参考代码），检索命中后注入提示词
     */
    public static final String CONTENT = "content";

    public static final String TYPE_STYLE = "style";
    public static final String TYPE_COMPONENT = "component";

    private CodeKnowledgeMetadata() {
    }
}
