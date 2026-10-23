package com.astr.astraicodemother.langgraph4j.tools;

import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;

class UndrawIllustrationToolTest {

    private final UndrawIllustrationTool undrawIllustrationTool = new UndrawIllustrationTool();

    @Test
    void searchIllustrations() {
        List<ImageResource> images = undrawIllustrationTool.searchIllustrations("coffee");
        Assertions.assertFalse(images.isEmpty());
        images.forEach(image -> Assertions.assertTrue(image.getUrl().startsWith("https://")));
    }
}
