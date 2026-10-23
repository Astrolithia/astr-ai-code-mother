package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.model.enums.ImageCategoryEnum;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

class PromptEnhancerNodeTest {

    @Test
    void appendImagesGroupedByCategory() throws Exception {
        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个咖啡店官网",
                CodeGenWorkflowState.IMAGE_LIST, List.of(
                        image(ImageCategoryEnum.LOGO, "咖啡店 Logo", "https://cdn.example.com/logo.png"),
                        image(ImageCategoryEnum.CONTENT, "拿铁", "https://images.example.com/latte.jpg"))));
        Map<String, Object> result = PromptEnhancerNode.create().apply(state).get();
        String expected = """
                做一个咖啡店官网

                ## 可用素材资源
                请在生成网站使用以下图片资源，将这些图片合理地嵌入到网站的相应位置中。
                - 内容图片：拿铁（https://images.example.com/latte.jpg）
                - Logo 设计图片：咖啡店 Logo（https://cdn.example.com/logo.png）
                """;
        Assertions.assertEquals(expected, result.get(CodeGenWorkflowState.ENHANCED_PROMPT));
    }

    @Test
    void keepOriginalPromptWhenNoImages() throws Exception {
        CodeGenWorkflowState state = new CodeGenWorkflowState(Map.of(
                CodeGenWorkflowState.ORIGINAL_PROMPT, "做一个咖啡店官网"));
        Map<String, Object> result = PromptEnhancerNode.create().apply(state).get();
        Assertions.assertEquals("做一个咖啡店官网", result.get(CodeGenWorkflowState.ENHANCED_PROMPT));
    }

    private static ImageResource image(ImageCategoryEnum category, String description, String url) {
        return ImageResource.builder().category(category).description(description).url(url).build();
    }
}
