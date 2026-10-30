package com.astr.astraicodemother.langgraph4j.visual;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;

class VisualQualityCheckerTest {

    @Test
    @DisplayName("真实检测存在遮挡的Vue项目产物，精准命中元素重叠缺陷")
    void detectsVisualOverlap() {
        VisualQualityChecker checker = new VisualQualityChecker();
        String targetDist = new File("tmp/code_output/vue_project_473697843824226304/dist").getAbsolutePath();

        File distDir = new File(targetDist);
        if (!distDir.exists()) {
            System.out.println("测试产物目录不存在，跳过本次本地测试: " + targetDist);
            return;
        }

        VisualQualityResult result = checker.inspect(targetDist, "tmp/visual-qa-test.png");
        Assertions.assertNotNull(result);
        System.out.println("=== 视觉质检结果 ===");
        System.out.println("是否通过: " + result.getIsValid());
        System.out.println("缺陷列表: " + result.getVisualErrors());
        System.out.println("修复建议: " + result.getSuggestions());

        // 验证它确实抓出了我们刚才人工肉眼看到的遮挡 Bug
        Assertions.assertFalse(result.getIsValid(), "应该判定存在视觉缺陷");
        Assertions.assertTrue(result.getVisualErrors().stream().anyMatch(e -> e.contains("预约产品演示") || e.contains("重叠遮挡")));
    }
}
