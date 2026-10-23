package com.astr.astraicodemother.ai.image;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpUtil;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesis;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisParam;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 通义万相文生图（阿里云 DashScope）
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "image-generation", name = "provider", havingValue = "dashscope", matchIfMissing = true)
public class DashScopeImageGenerator implements ImageGenerator {

    @Value("${dashscope.api-key}")
    private String apiKey;

    @Value("${dashscope.image-model}")
    private String imageModel;

    @Override
    public List<byte[]> generate(String prompt, String size) {
        List<byte[]> images = new ArrayList<>();
        try {
            ImageSynthesisParam param = ImageSynthesisParam.builder()
                    .apiKey(apiKey)
                    .model(imageModel)
                    .prompt(prompt)
                    .size(size)
                    .n(1)
                    .build();
            // 同步调用，SDK 内部会轮询异步任务直到完成
            ImageSynthesisResult result = new ImageSynthesis().call(param);
            if (result == null || result.getOutput() == null || result.getOutput().getResults() == null) {
                log.warn("通义万相未返回图片，任务状态: {}", result == null ? null : result.getOutput());
                return images;
            }
            for (Map<String, String> item : result.getOutput().getResults()) {
                String url = item.get("url");
                // 返回的是 24 小时有效的临时地址，需要下载后转存
                if (StrUtil.isNotBlank(url)) {
                    images.add(HttpUtil.downloadBytes(url));
                }
            }
        } catch (Exception e) {
            log.error("通义万相生成图片失败: {}", e.getMessage(), e);
        }
        return images;
    }
}
