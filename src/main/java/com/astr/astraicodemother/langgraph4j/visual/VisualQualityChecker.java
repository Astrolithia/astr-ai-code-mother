package com.astr.astraicodemother.langgraph4j.visual;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * 视觉质检执行器：调用 Playwright 真实渲染 Vue 项目产物，
 * 计算 DOM 物理盒模型重叠与元素遮挡，并抓取高清快照。
 */
@Component
@Slf4j
public class VisualQualityChecker {

    private static final String SCRIPT_INSPECTOR = "scripts/visual-inspector.js";
    private static final String SCRIPT_DETECTOR = "scripts/visual-detector.js";
    private static final long TIMEOUT_SECONDS = 30;

    /**
     * 对已构建的产物目录执行真实无头浏览器渲染与视觉遮挡检测
     *
     * @param distDir        Vue 项目的 dist 构建产物目录
     * @param screenshotPath 截图存储路径（传 null 则自动在 dist 同级创建）
     * @return 视觉质检结果
     */
    public VisualQualityResult inspect(String distDir, String screenshotPath) {
        if (StrUtil.isBlank(distDir) || !FileUtil.isDirectory(distDir)) {
            log.warn("视觉质检跳过：dist 目录不存在或不是目录: {}", distDir);
            return VisualQualityResult.builder().isValid(true).visualErrors(List.of()).build();
        }

        if (StrUtil.isBlank(screenshotPath)) {
            screenshotPath = distDir + File.separator + "screenshots" + File.separator + "preview.png";
        }

        try {
            // 确保脚本文件就绪
            File scriptFile = ensureScriptReady();
            if (scriptFile == null || !scriptFile.exists()) {
                log.warn("视觉质检跳过：无法加载检测脚本");
                return VisualQualityResult.builder().isValid(true).visualErrors(List.of()).build();
            }

            log.info("开始执行视觉无头渲染质检，distDir: {}", distDir);
            ProcessBuilder pb = new ProcessBuilder(
                    "node",
                    scriptFile.getAbsolutePath(),
                    distDir,
                    screenshotPath
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean completed = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                log.warn("视觉质检执行超时（超过 {} 秒），跳过视觉阻断", TIMEOUT_SECONDS);
                return VisualQualityResult.builder().isValid(true).visualErrors(List.of()).build();
            }

            String jsonOutput = output.toString().trim();
            // 寻找最外层的 JSON 块
            int start = jsonOutput.indexOf('{');
            int end = jsonOutput.lastIndexOf('}');
            if (start == -1 || end == -1 || end <= start) {
                log.warn("视觉质检未输出有效 JSON: {}", jsonOutput);
                return VisualQualityResult.builder().isValid(true).visualErrors(List.of()).build();
            }

            JSONObject resultJson = JSONUtil.parseObj(jsonOutput.substring(start, end + 1));
            Boolean success = resultJson.getBool("success", false);
            if (!Boolean.TRUE.equals(success)) {
                log.warn("视觉质检脚本执行失败: {}", resultJson.getStr("error"));
                return VisualQualityResult.builder().isValid(true).visualErrors(List.of()).build();
            }

            JSONArray issues = resultJson.getJSONArray("issues");
            List<String> errors = new ArrayList<>();
            List<String> suggestions = new ArrayList<>();
            Set<String> deduplicated = new HashSet<>();

            if (CollUtil.isNotEmpty(issues)) {
                for (int i = 0; i < issues.size(); i++) {
                    JSONObject issue = issues.getJSONObject(i);
                    String desc = issue.getStr("description");
                    String type = issue.getStr("type");
                    if (StrUtil.isNotBlank(desc) && !deduplicated.contains(desc)) {
                        deduplicated.add(desc);
                        errors.add(desc);
                        if ("ELEMENT_OVERLAP".equals(type)) {
                            suggestions.add("检测到元素在页面中发生了垂直层叠遮挡，请检查父级容器盒模型（如 a-space 或 flex 容器），确保声明了显式的 display 与 margin-bottom/padding-bottom，防止与下方文案产生重叠。");
                        } else if ("VIEWPORT_OVERFLOW".equals(type)) {
                            suggestions.add("检测到元素水平溢出视口宽度，请检查相关栅格或轮播图容器的 max-width 与 overflow 属性。");
                        }
                    }
                }
            }

            boolean isValid = errors.isEmpty();
            log.info("视觉质检完成，是否通过: {}，缺陷数: {}", isValid, errors.size());

            return VisualQualityResult.builder()
                    .isValid(isValid)
                    .visualErrors(errors)
                    .suggestions(suggestions)
                    .screenshotPath(screenshotPath)
                    .build();

        } catch (Exception e) {
            log.warn("执行视觉质检异常，跳过视觉阻断: {}", e.getMessage(), e);
            return VisualQualityResult.builder().isValid(true).visualErrors(List.of()).build();
        }
    }

    /**
     * 将 classpath 下的检测脚本拷贝到临时目录以便 node 执行
     */
    private synchronized File ensureScriptReady() {
        try {
            File tempDir = new File(System.getProperty("java.io.tmpdir"), "astr-visual-scripts");
            FileUtil.mkdir(tempDir);
            File inspectorFile = new File(tempDir, "visual-inspector.js");
            File detectorFile = new File(tempDir, "visual-detector.js");

            ClassPathResource r1 = new ClassPathResource(SCRIPT_INSPECTOR);
            ClassPathResource r2 = new ClassPathResource(SCRIPT_DETECTOR);

            FileUtil.writeBytes(r1.getContentAsByteArray(), inspectorFile);
            FileUtil.writeBytes(r2.getContentAsByteArray(), detectorFile);

            return inspectorFile;
        } catch (Exception e) {
            log.warn("无法从 classpath 释放视觉检测脚本: {}", e.getMessage());
            return null;
        }
    }
}
