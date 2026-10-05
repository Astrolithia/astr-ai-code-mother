package com.astr.astraicodemother.ai.tools;

import com.astr.astraicodemother.constant.AppConstant;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileWriteToolTest {

    private final FileWriteTool tool = new FileWriteTool();
    private final long appId = ThreadLocalRandom.current().nextLong(1, Long.MAX_VALUE);
    private final Path baseDir = Path.of(AppConstant.CODE_OUTPUT_ROOT_DIR,
            CodeGenTypeEnum.VUE_PROJECT.getValue() + "_" + appId).toAbsolutePath().normalize();

    @AfterEach
    void cleanUp() throws IOException {
        if (Files.exists(baseDir)) {
            try (Stream<Path> paths = Files.walk(baseDir)) {
                for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                    Files.deleteIfExists(path);
                }
            }
        }
    }

    @Test
    void writesUtf8ContentAndCreatesParentDirectories() throws IOException {
        String content = "<template>你好，世界 🌍</template>\n";

        assertTrue(tool.writeFile("src/components/App.vue", content, appId).startsWith("文件写入成功"));
        assertEquals(content, Files.readString(baseDir.resolve("src/components/App.vue"), StandardCharsets.UTF_8));
    }

    @Test
    void overwritesExistingFileAndAllowsEmptyContent() throws IOException {
        tool.writeFile("index.html", "original content", appId);
        assertTrue(tool.writeFile("index.html", "new", appId).startsWith("文件写入成功"));
        assertEquals("new", Files.readString(baseDir.resolve("index.html")));
        assertTrue(tool.writeFile("index.html", "", appId).startsWith("文件写入成功"));
        assertEquals(0L, Files.size(baseDir.resolve("index.html")));
    }

    @Test
    void rejectsInvalidArgumentsWithoutCreatingApplicationDirectory() {
        assertFailure(null, "content", appId);
        assertFailure(" \t", "content", appId);
        assertFailure("file.txt", null, appId);
        assertFailure("file.txt", "content", null);
        assertFailure("file.txt", "content", 0L);
        assertFailure("file.txt", "content", -1L);
        assertFailure("invalid\0path", "content", appId);
        assertFalse(Files.exists(baseDir));
    }

    @Test
    void rejectsAbsoluteAndEscapingPaths() {
        assertFailure(baseDir.resolve("file.txt").toString(), "content", appId);
        assertFailure("../escape.txt", "content", appId);
        assertFailure("src/../../escape.txt", "content", appId);
        assertFailure(".", "content", appId);
        assertFailure("src/..", "content", appId);
        assertFalse(Files.exists(baseDir));
    }

    @Test
    void rejectsSymbolicLinkDirectoriesAndFiles() throws IOException {
        Files.createDirectories(baseDir.resolve("actual"));
        Files.createSymbolicLink(baseDir.resolve("linked"), baseDir.resolve("actual"));
        assertFailure("linked/file.txt", "content", appId);
        assertFalse(Files.exists(baseDir.resolve("actual/file.txt")));

        Path target = baseDir.resolve("actual/file.txt");
        Files.writeString(target, "original");
        Files.createSymbolicLink(baseDir.resolve("file.txt"), target);
        assertFailure("file.txt", "changed", appId);
        assertEquals("original", Files.readString(target));
    }

    @Test
    void returnsFailureWhenParentIsAFile() throws IOException {
        Files.createDirectories(baseDir);
        Files.writeString(baseDir.resolve("src"), "not a directory");
        assertFailure("src/App.vue", "content", appId);
        assertEquals("not a directory", Files.readString(baseDir.resolve("src")));
    }

    private void assertFailure(String path, String content, Long memoryId) {
        assertTrue(tool.writeFile(path, content, memoryId).startsWith("文件写入失败"));
    }
}
