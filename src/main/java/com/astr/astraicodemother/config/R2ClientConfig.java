package com.astr.astraicodemother.config;

import cn.hutool.core.util.StrUtil;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

/**
 * Cloudflare R2 客户端配置（通过 S3 兼容接口访问）
 */
@Configuration
@ConfigurationProperties(prefix = "r2")
@Data
public class R2ClientConfig {

    /**
     * Cloudflare 账户 ID，用于拼接 S3 接口地址
     */
    private String accountId;

    private String accessKeyId;

    private String secretAccessKey;

    /**
     * 桶名
     */
    private String bucket;

    /**
     * 桶绑定的公开访问域名，如 https://cdn.example.com
     */
    private String publicDomain;

    /**
     * 懒加载：未配置 R2 时应用仍可启动，首次上传时才创建客户端
     */
    @Bean(destroyMethod = "close")
    @Lazy
    public S3Client r2Client() {
        if (StrUtil.hasBlank(accountId, accessKeyId, secretAccessKey)) {
            throw new IllegalStateException("R2 未配置，请在 application-{profile}.yml 中填写 r2.account-id、access-key-id、secret-access-key");
        }
        return S3Client.builder()
                .endpointOverride(URI.create(String.format("https://%s.r2.cloudflarestorage.com", accountId)))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                // SDK 要求必填，R2 不使用
                .region(Region.of("auto"))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        // SDK 默认的分块签名上传与 R2 不兼容，会返回 403 签名错误
                        .chunkedEncodingEnabled(false)
                        .build())
                .build();
    }
}
