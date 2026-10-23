package com.astr.astraicodemother.manager;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.IdUtil;
import com.astr.astraicodemother.config.R2ClientConfig;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.util.Date;

/**
 * 对象存储操作（Cloudflare R2）
 */
@Slf4j
@Component
public class ObjectStorageManager {

    /**
     * 工作流生成的素材统一放在该目录下，与手动上传的文件隔开
     */
    private static final String KEY_PREFIX = "ai-code-mother";

    @Resource
    private R2ClientConfig r2ClientConfig;

    @Lazy
    @Resource
    private S3Client r2Client;

    /**
     * 上传二进制内容
     *
     * @param key         对象键（不以 / 开头）
     * @param data        文件内容
     * @param contentType 文件类型，如 image/png，决定浏览器能否直接展示
     * @return 文件公开访问地址
     */
    public String uploadBytes(String key, byte[] data, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(r2ClientConfig.getBucket())
                .key(key)
                .contentType(contentType)
                .build();
        r2Client.putObject(putObjectRequest, RequestBody.fromBytes(data));
        String url = r2ClientConfig.getPublicDomain() + "/" + key;
        log.info("文件上传到 R2 成功: {}", url);
        return url;
    }

    /**
     * 生成对象键：ai-code-mother/{目录}/{日期}/{uuid}.{后缀}
     *
     * @param dir    业务目录，如 logo、diagram
     * @param suffix 文件后缀，不带点
     */
    public String buildKey(String dir, String suffix) {
        return String.format("%s/%s/%s/%s.%s", KEY_PREFIX, dir,
                DateUtil.formatDate(new Date()), IdUtil.fastSimpleUUID(), suffix);
    }
}
