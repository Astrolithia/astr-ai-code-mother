package com.astr.astraicodemother.ai.image;

import java.util.List;

/**
 * 文生图模型
 * <p>
 * 通过 image-generation.provider 配置选择实现，新增模型（如 OpenAI 兼容接口的 Gemini）只需新增实现类
 */
public interface ImageGenerator {

    /**
     * 根据提示词生成图片
     *
     * @param prompt 提示词
     * @param size   图片尺寸，如 512*512
     * @return PNG 图片内容，失败时返回空列表
     */
    List<byte[]> generate(String prompt, String size);
}
