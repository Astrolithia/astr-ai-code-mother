package com.astr.astraicodemother.ai;

import com.astr.astraicodemother.ai.model.HtmlCodeResult;
import com.astr.astraicodemother.ai.model.MultiFileCodeResult;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import reactor.core.publisher.Flux;

@SpringBootTest
@ActiveProfiles("local")
class AiCodeGeneratorServiceTest {

    @Resource
    private AiCodeGeneratorService aiCodeGeneratorService;

    @Test
    void generateHtmlCode() {
        HtmlCodeResult result = aiCodeGeneratorService.generateCode("做个博客，不超过20行");
        Assertions.assertNotNull(result);
    }

    @Test
    void generateMultiFileCode() {
        MultiFileCodeResult result = aiCodeGeneratorService.generateMultiCode("做个留言板，不超过50行");
        Assertions.assertNotNull(result);
    }

    @Test
    void testChatMemory() {
        HtmlCodeResult result = aiCodeGeneratorService.generateCode("做个程序员Astr的工具网站，总代码量不超过20行");
        Assertions.assertNotNull(result);
        result = aiCodeGeneratorService.generateCode("不要生成网站，告诉我你刚刚做了什么");
        Assertions.assertNotNull(result);
        result = aiCodeGeneratorService.generateCode("做个程序员Astr的工具网站，总代码量不超过 20 行");
        Assertions.assertNotNull(result);
        result = aiCodeGeneratorService.generateCode("不要生成网站，告诉我你刚刚做了什么");
        Assertions.assertNotNull(result);
    }

}
