package com.astr.astraicodemother.langgraph4j.tools;

import com.astr.astraicodemother.ai.image.ImageGenerator;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.model.enums.ImageCategoryEnum;
import com.astr.astraicodemother.manager.ObjectStorageManager;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Logo 生成工具：AI 文生图 → 上传对象存储
 */
@Slf4j
@Component
public class LogoGeneratorTool {

    private static final String LOGO_SIZE = "512*512";

    @Resource
    private ImageGenerator imageGenerator;

    @Resource
    private ObjectStorageManager objectStorageManager;

    @Tool("根据描述生成 Logo 设计图片，用于网站品牌标识")
    public List<ImageResource> generateLogos(@P("Logo 设计描述，如名称、行业、风格等，尽量详细") String description) {
        List<ImageResource> logoList = new ArrayList<>();
        String logoPrompt = String.format("生成 Logo，Logo 中禁止包含任何文字！Logo 介绍：%s", description);
        try {
            for (byte[] image : imageGenerator.generate(logoPrompt, LOGO_SIZE)) {
                String key = objectStorageManager.buildKey("logo", "png");
                String url = objectStorageManager.uploadBytes(key, image, "image/png");
                logoList.add(ImageResource.builder()
                        .category(ImageCategoryEnum.LOGO)
                        .description(description)
                        .url(url)
                        .build());
            }
        } catch (Exception e) {
            log.error("生成 Logo 失败: {}", e.getMessage(), e);
        }
        return logoList;
    }
}
