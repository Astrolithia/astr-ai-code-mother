package com.astr.astraicodemother.langgraph4j.tools;

import cn.hutool.core.util.ReUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.util.URLUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.http.HttpStatus;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.model.enums.ImageCategoryEnum;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 插画搜索工具（unDraw）
 * <p>
 * unDraw 没有公开 API，这里调用其网站（Next.js）的页面数据接口。
 * 接口路径中的 buildId 会随网站发版变化，因此从首页动态解析并缓存，失效（404）时重新获取。
 */
@Slf4j
@Component
public class UndrawIllustrationTool {

    private static final String UNDRAW_HOME_URL = "https://undraw.co/";

    private static final String UNDRAW_SEARCH_URL = "https://undraw.co/_next/data/%s/search/%s.json?term=%s";

    private volatile String buildId;

    @Tool("搜索插画图片，用于网站美化和装饰")
    public List<ImageResource> searchIllustrations(@P("搜索关键词") String query) {
        List<ImageResource> imageList = new ArrayList<>();
        int searchCount = 4;
        try {
            JSONArray results = search(query, false);
            if (results == null) {
                return imageList;
            }
            for (int i = 0; i < Math.min(searchCount, results.size()); i++) {
                JSONObject illustration = results.getJSONObject(i);
                String media = illustration.getStr("media");
                if (StrUtil.isNotBlank(media)) {
                    imageList.add(ImageResource.builder()
                            .category(ImageCategoryEnum.ILLUSTRATION)
                            .description(illustration.getStr("title", "插画"))
                            .url(media)
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("unDraw 插画搜索失败: {}", e.getMessage(), e);
        }
        return imageList;
    }

    /**
     * 搜索插画，buildId 失效时刷新后重试一次
     */
    private JSONArray search(String query, boolean retried) {
        String encodedQuery = URLUtil.encode(query);
        String apiUrl = String.format(UNDRAW_SEARCH_URL, getBuildId(retried), encodedQuery, encodedQuery);
        try (HttpResponse response = HttpRequest.get(apiUrl).timeout(10000).execute()) {
            if (response.getStatus() == HttpStatus.HTTP_NOT_FOUND && !retried) {
                log.info("unDraw buildId 已失效，重新获取");
                return search(query, true);
            }
            if (!response.isOk()) {
                log.warn("unDraw 接口返回异常状态: {}", response.getStatus());
                return null;
            }
            JSONObject pageProps = JSONUtil.parseObj(response.body()).getJSONObject("pageProps");
            return pageProps == null ? null : pageProps.getJSONArray("initialResults");
        }
    }

    private String getBuildId(boolean refresh) {
        if (buildId == null || refresh) {
            try (HttpResponse response = HttpRequest.get(UNDRAW_HOME_URL).timeout(10000).execute()) {
                buildId = ReUtil.get("\"buildId\":\"([^\"]+)\"", response.body(), 1);
            }
            if (buildId == null) {
                throw new IllegalStateException("无法从 unDraw 首页解析 buildId");
            }
        }
        return buildId;
    }
}
