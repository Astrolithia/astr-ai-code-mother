package com.astr.astraicodemother.core.template;

import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * 读取并缓存代码模板。
 */
@Component
@Slf4j
public class CodeTemplateProvider {

    private static final String MULTI_FILE_TEMPLATE_PATH =
            "code-template/multi-file/basic-v1.txt";

    // 限制文件大小，防止意外加载过大的模板。
    private static final int MAX_TEMPLATE_BYTES = 64 * 1024;

    private String multiFileTemplate = "";

    @PostConstruct
    public void init() {
        ClassPathResource resource =
                new ClassPathResource(MULTI_FILE_TEMPLATE_PATH);

        try (InputStream inputStream = resource.getInputStream()) {
            byte[] bytes = inputStream.readNBytes(MAX_TEMPLATE_BYTES + 1);

            if (bytes.length > MAX_TEMPLATE_BYTES) {
                log.warn("代码模板超过 64 KiB，跳过加载：{}",
                        MULTI_FILE_TEMPLATE_PATH);
                return;
            }

            String content = new String(bytes, StandardCharsets.UTF_8);

            if (content.isBlank()) {
                log.warn("代码模板为空，跳过加载：{}",
                        MULTI_FILE_TEMPLATE_PATH);
                return;
            }

            multiFileTemplate = content;

            log.info("代码模板加载成功，路径：{}，字符数：{}",
                    MULTI_FILE_TEMPLATE_PATH,
                    multiFileTemplate.length());
        } catch (IOException e) {
            log.warn("代码模板读取失败，将不使用模板：{}",
                    MULTI_FILE_TEMPLATE_PATH, e);
        }
    }

    public String getTemplate(CodeGenTypeEnum codeGenType) {
        if (codeGenType == CodeGenTypeEnum.MULTI_FILE) {
            return multiFileTemplate;
        }
        return "";
    }
}