package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.io.FileUtil;
import com.astr.astraicodemother.langgraph4j.model.QualityResult;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.io.File;
import java.nio.file.Path;
import java.util.Map;

@SpringBootTest
@ActiveProfiles("local")
class CodeQualityCheckNodeTest {

    @Test
    void checkBrokenCode(@TempDir Path codeDir) throws Exception {
        // 未闭合的标签和 JS 语法错误
        FileUtil.writeUtf8String("""
                <!DOCTYPE html>
                <html>
                <head><title>咖啡店</title></head>
                <body>
                  <div class="header"><h1>咖啡店
                  <script>
                    function order( {
                      alert('下单成功'
                    }
                  </script>
                </body>
                </html>
                """, new File(codeDir.toFile(), "index.html"));
        // 残留的依赖目录应被跳过
        FileUtil.writeUtf8String("{}", new File(codeDir.toFile(), "node_modules/pkg/package.json"));

        CodeGenWorkflowState state = new CodeGenWorkflowState(
                Map.of(CodeGenWorkflowState.GENERATED_CODE_DIR, codeDir.toString()));
        Map<String, Object> output = CodeQualityCheckNode.create().apply(state).get();

        QualityResult qualityResult = (QualityResult) output.get(CodeGenWorkflowState.QUALITY_RESULT);
        System.out.println(qualityResult);
        Assertions.assertTrue(qualityResult.needsFix());
        Assertions.assertEquals(1, output.get(CodeGenWorkflowState.QUALITY_CHECK_COUNT));
    }
}
