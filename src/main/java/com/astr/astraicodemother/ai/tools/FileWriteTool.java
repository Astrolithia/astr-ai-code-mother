package com.astr.astraicodemother.ai.tools;

import com.astr.astraicodemother.constant.AppConstant;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.ToolMemoryId;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

@Slf4j
public class FileWriteTool {

    @Tool("写入文件到指定路径")
    public String writeFile(@P("文件的相对路径") String relativeFilePath, @P("要写入文件的内容") String content,
                            @ToolMemoryId Long memoryId) {

        if (memoryId == null || memoryId <= 0) {
            return "文件写入失败：应用 ID 必须为正数";
        }
        if (relativeFilePath == null || relativeFilePath.isBlank()) {
            return "文件写入失败：文件相对路径不能为空";
        }
        if (content == null) {
            return "文件写入失败：文件内容不能为 null";
        }

        try {
            Path baseDir = Path.of(AppConstant.CODE_OUTPUT_ROOT_DIR,
                    CodeGenTypeEnum.VUE_PROJECT.getValue() + "_" + memoryId).toAbsolutePath().normalize();
            Path relativePath = Path.of(relativeFilePath);
            Path filePath = baseDir.resolve(relativePath).normalize();
            if (relativePath.isAbsolute() || !filePath.startsWith(baseDir) || filePath.equals(baseDir)) {
                return "文件写入失败：文件路径必须位于当前应用目录内";
            }
            // 禁止通过已有的符号链接写入其他应用或应用目录之外的文件。
            Path currentPath = baseDir;
            if (Files.isSymbolicLink(currentPath)) {
                return "文件写入失败：文件路径不能包含符号链接";
            }
            for (Path part : baseDir.relativize(filePath)) {
                currentPath = currentPath.resolve(part);
                if (Files.isSymbolicLink(currentPath)) {
                    return "文件写入失败：文件路径不能包含符号链接";
                }
            }
            Files.createDirectories(filePath.getParent());
            Files.writeString(filePath, content, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS);
            log.info("文件写入成功，appId: {}, 文件: {}", memoryId, filePath);
            return "文件写入成功：" + relativeFilePath;
        } catch (IOException | InvalidPathException | SecurityException e) {
            log.error("文件写入失败，appId: {}, 文件: {}", memoryId, relativeFilePath, e);
            return "文件写入失败：" + e.getMessage();
        }
    }
}
