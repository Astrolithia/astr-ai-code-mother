package com.astr.astraicodemother.langgraph4j.tools;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.io.IoUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.system.SystemUtil;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.model.enums.ImageCategoryEnum;
import com.astr.astraicodemother.manager.ObjectStorageManager;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * 架构图生成工具：Mermaid 代码 → mmdc 渲染 SVG → 上传对象存储
 * <p>
 * 依赖本地安装的 Mermaid CLI：npm install -g @mermaid-js/mermaid-cli
 */
@Slf4j
@Component
public class MermaidDiagramTool {

    /**
     * mmdc 需要启动无头浏览器，首次运行较慢
     */
    private static final long RENDER_TIMEOUT_SECONDS = 60;

    @Resource
    private ObjectStorageManager objectStorageManager;

    @Tool("将 Mermaid 代码转换为架构图图片，用于展示系统结构和技术关系")
    public List<ImageResource> generateMermaidDiagram(@P("Mermaid 图表代码") String mermaidCode,
                                                      @P("架构图描述") String description) {
        List<ImageResource> imageList = new ArrayList<>();
        if (StrUtil.isBlank(mermaidCode)) {
            return imageList;
        }
        File inputFile = null;
        File outputFile = null;
        try {
            inputFile = FileUtil.createTempFile("mermaid_input_", ".mmd", true);
            FileUtil.writeUtf8String(mermaidCode, inputFile);
            outputFile = FileUtil.createTempFile("mermaid_output_", ".svg", true);
            renderSvg(inputFile, outputFile);
            String url = objectStorageManager.uploadBytes(objectStorageManager.buildKey("diagram", "svg"),
                    FileUtil.readBytes(outputFile), "image/svg+xml");
            imageList.add(ImageResource.builder()
                    .category(ImageCategoryEnum.ARCHITECTURE)
                    .description(description)
                    .url(url)
                    .build());
        } catch (Exception e) {
            log.error("生成架构图失败: {}", e.getMessage(), e);
        } finally {
            FileUtil.del(inputFile);
            FileUtil.del(outputFile);
        }
        return imageList;
    }

    private void renderSvg(File inputFile, File outputFile) throws Exception {
        String command = SystemUtil.getOsInfo().isWindows() ? "mmdc.cmd" : "mmdc";
        Process process = new ProcessBuilder(command,
                "-i", inputFile.getAbsolutePath(),
                "-o", outputFile.getAbsolutePath(),
                "-b", "transparent")
                .redirectErrorStream(true)
                .start();
        if (!process.waitFor(RENDER_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IllegalStateException("Mermaid CLI 渲染超时");
        }
        String output = IoUtil.read(process.getInputStream(), StandardCharsets.UTF_8);
        if (process.exitValue() != 0 || outputFile.length() == 0) {
            throw new IllegalStateException("Mermaid CLI 渲染失败: " + output);
        }
    }
}
