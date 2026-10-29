package com.astr.astraicodemother.knowledge;

import com.astr.astraicodemother.knowledge.CodeKnowledgeRetriever.CodeKnowledge;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingSearchRequest;
import dev.langchain4j.store.embedding.EmbeddingStore;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 真实调用 DashScope Embedding，启动时会完成知识库入库
 */
@SpringBootTest
@ActiveProfiles("local")
class CodeKnowledgeRetrieverTest {

    private static final CodeGenTypeEnum VUE = CodeGenTypeEnum.VUE_PROJECT;

    @Resource
    private CodeKnowledgeRetriever retriever;

    @Resource
    private CodeKnowledgeEnhancer codeKnowledgeEnhancer;

    @Resource
    private EmbeddingModel codeKnowledgeEmbeddingModel;

    @Resource
    private EmbeddingStore<TextSegment> codeKnowledgeEmbeddingStore;

    @Test
    @DisplayName("风格查询命中对应风格包")
    void retrievesStyle() {
        assertAll(
                () -> assertEquals("tech-dark", idOf(retriever.retrieveStyle("AI 写作助手的产品官网，要有科技感和未来感", VUE))),
                () -> assertEquals("minimal-light", idOf(retriever.retrieveStyle("简洁干净的个人作品集网站", VUE)))
        );
    }

    @Test
    @DisplayName("组件查询在指定区块内命中，正文包含参考代码")
    void retrievesComponent() {
        Optional<CodeKnowledge> navbar = retriever.retrieveComponent("navbar", "顶部导航，包含首页、菜单、关于我们", VUE);

        assertAll(
                () -> assertEquals("vue-navbar-top-menu", idOf(navbar)),
                () -> assertTrue(navbar.orElseThrow().content().contains("a-menu")),
                () -> assertEquals("vue-pricing-table", idOf(retriever.retrieveComponent("pricing", "会员套餐价格对比", VUE)))
        );
    }

    @Test
    @DisplayName("不存在的区块或其他生成模式不返回结果")
    void filtersByMetadata() {
        assertAll(
                () -> assertTrue(retriever.retrieveComponent("gallery", "图片画廊", VUE).isEmpty()),
                () -> assertTrue(retriever.retrieveComponent("navbar", "顶部导航", CodeGenTypeEnum.MULTI_FILE).isEmpty())
        );
    }

    /**
     * 不设阈值打印全部相似度，用来校准 code-knowledge.min-score
     */
    @Test
    @DisplayName("打印相似度分布")
    void printScores() {
        List<String> queries = List.of(
                "AI 写作助手的产品官网，要有科技感和未来感",
                "简洁干净的个人作品集网站",
                "温暖复古的咖啡店官网",
                "顶部导航，包含首页、菜单、关于我们",
                "会员套餐价格对比",
                "预约试驾表单",
                "今天天气怎么样");
        for (String query : queries) {
            System.out.println("查询：" + query);
            codeKnowledgeEmbeddingStore.search(EmbeddingSearchRequest.builder()
                            .queryEmbedding(codeKnowledgeEmbeddingModel.embed(query).content())
                            .maxResults(3)
                            .build())
                    .matches()
                    .forEach(m -> System.out.printf("  %.3f  %s%n", m.score(), m.embedded().metadata().getString("id")));
        }
    }

    @Test
    @DisplayName("端到端检索增强：根据完整需求生成带风格规范和多组件参考的提示词")
    void enhancerEndToEnd() {
        Optional<String> promptOpt = codeKnowledgeEnhancer.enhanceKnowledge(
                "做一个科技感AI写作助手官网，需要导航栏、核心特性和套餐定价", VUE);
        assertTrue(promptOpt.isPresent());
        String prompt = promptOpt.get();
        System.out.println("=== 端到端检索增强结果 ===");
        System.out.println(prompt);
        assertAll(
                () -> assertTrue(prompt.contains("代码知识库参考")),
                () -> assertTrue(prompt.contains("tech-dark")),
                () -> assertTrue(prompt.contains("vue-navbar-top-menu")),
                () -> assertTrue(prompt.contains("vue-pricing-table"))
        );
    }

    private static String idOf(Optional<CodeKnowledge> knowledge) {
        return knowledge.map(CodeKnowledge::id).orElse(null);
    }
}
