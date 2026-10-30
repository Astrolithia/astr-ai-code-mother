package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import com.astr.astraicodemother.langgraph4j.ai.CodeQualityCheckService;
import com.astr.astraicodemother.langgraph4j.model.QualityResult;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 代码质量检查节点：读取生成的代码交给 AI 检查，未通过时由工作流带着错误信息回到代码生成节点
 */
@Slf4j
public class CodeQualityCheckNode {

    /**
     * 需要检查的文件扩展名
     */
    private static final List<String> CODE_EXTENSIONS = List.of(
            ".html", ".htm", ".css", ".js", ".json", ".vue", ".ts", ".jsx", ".tsx"
    );

    /**
     * 跳过的目录：同一 appId 多次生成会复用输出目录，可能残留上次构建的依赖和产物
     */
    private static final Set<String> SKIP_DIRS = Set.of("node_modules", "dist", "target", ".git");

    /**
     * 跳过的文件：锁文件体积大且不是 AI 生成的
     */
    private static final Set<String> SKIP_FILES = Set.of("package-lock.json", "pnpm-lock.yaml", "yarn.lock");

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            int checkCount = state.qualityCheckCount() + 1;
            log.info("执行节点: 代码质量检查，第 {} 次", checkCount);
            QualityResult qualityResult;
            String codeContent = readAndConcatenateCodeFiles(state.generatedCodeDir());
            if (StrUtil.isBlank(codeContent)) {
                log.warn("未找到可检查的代码文件: {}", state.generatedCodeDir());
                qualityResult = QualityResult.builder()
                        .isValid(false)
                        .errors(List.of("未找到可检查的代码文件"))
                        .suggestions(List.of("请确保代码生成成功并已保存文件"))
                        .build();
            } else {
                // 失败时由工作流的重试钩子重试，最终失败按通过处理
                CodeQualityCheckService qualityCheckService = SpringContextUtil.getBean(CodeQualityCheckService.class);
                qualityResult = qualityCheckService.checkCodeQuality(codeContent);
                log.info("代码质量检查完成，是否通过: {}，错误: {}", qualityResult.getIsValid(), qualityResult.getErrors());
            }
            Map<String, Object> updates = new java.util.HashMap<>();
            updates.put(CodeGenWorkflowState.QUALITY_RESULT, qualityResult);
            updates.put(CodeGenWorkflowState.QUALITY_CHECK_COUNT, checkCount);
            if (qualityResult != null && !Boolean.TRUE.equals(qualityResult.getIsValid()) && qualityResult.getErrors() != null) {
                updates.put(CodeGenWorkflowState.LAST_FAILED_QUALITY_ERRORS, qualityResult.getErrors());
            }
            return updates;
        });
    }

    /**
     * 读取并拼接代码目录下的所有代码文件
     */
    private static String readAndConcatenateCodeFiles(String codeDir) {
        if (StrUtil.isBlank(codeDir) || !FileUtil.isDirectory(codeDir)) {
            return "";
        }
        File directory = FileUtil.file(codeDir);
        StringBuilder codeContent = new StringBuilder();
        FileUtil.walkFiles(directory, file -> {
            String relativePath = FileUtil.subPath(directory.getAbsolutePath(), file.getAbsolutePath());
            if (shouldSkipFile(file, relativePath) || !isCodeFile(file)) {
                return;
            }
            codeContent.append("## 文件: ").append(relativePath).append("\n\n")
                    .append(FileUtil.readUtf8String(file)).append("\n\n");
        });
        if (codeContent.isEmpty()) {
            return "";
        }
        return "# 项目文件结构和代码内容\n\n" + codeContent;
    }

    private static boolean shouldSkipFile(File file, String relativePath) {
        if (file.getName().startsWith(".") || SKIP_FILES.contains(file.getName())) {
            return true;
        }
        // 相对路径中任意一级目录命中即跳过
        List<String> parts = StrUtil.split(relativePath, File.separatorChar);
        return parts.subList(0, parts.size() - 1).stream().anyMatch(SKIP_DIRS::contains);
    }

    private static boolean isCodeFile(File file) {
        String fileName = file.getName().toLowerCase();
        return CODE_EXTENSIONS.stream().anyMatch(fileName::endsWith);
    }
}
