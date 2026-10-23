package com.astr.astraicodemother.manager;

import cn.hutool.http.HttpResponse;
import cn.hutool.http.HttpUtil;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.nio.charset.StandardCharsets;

@SpringBootTest
@ActiveProfiles("local")
class ObjectStorageManagerTest {

    @Resource
    private ObjectStorageManager objectStorageManager;

    @Test
    void uploadBytes() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"/>";
        String url = objectStorageManager.uploadBytes(objectStorageManager.buildKey("test", "svg"),
                svg.getBytes(StandardCharsets.UTF_8), "image/svg+xml");
        System.out.println(url);
        // 通过公开域名能访问到，且类型正确，浏览器才能直接展示
        try (HttpResponse response = HttpUtil.createGet(url).execute()) {
            Assertions.assertTrue(response.isOk());
            Assertions.assertEquals("image/svg+xml", response.header("Content-Type"));
        }
    }
}
