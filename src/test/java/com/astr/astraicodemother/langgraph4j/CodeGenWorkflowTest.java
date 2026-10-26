package com.astr.astraicodemother.langgraph4j;

import cn.hutool.core.io.FileUtil;
import com.astr.astraicodemother.constant.AppConstant;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import org.bsc.langgraph4j.GraphStateException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Duration;
import java.util.List;

@SpringBootTest
@ActiveProfiles("local")
class CodeGenWorkflowTest {

    /**
     * 真实应用 ID 为雪花算法生成的长整数，测试使用小数值避免冲突
     */
    private static final Long TEST_APP_ID = 1L;

    /**
     * Vue 工程模式单独使用一个 ID，避免与其他模式的输出目录和对话记忆混在一起
     */
    private static final Long TEST_VUE_APP_ID = 2L;

    private static final Long TEST_MULTI_FILE_APP_ID = 3L;

    @Test
    void executeWorkflow() throws GraphStateException {
        printAndCheck(new CodeGenWorkflow()
                .executeWorkflow("帮我做一个咖啡店官网，需要 Logo 和门店系统架构介绍", TEST_APP_ID));
    }

    @Test
    void executeVueProjectWorkflow() throws GraphStateException {
        CodeGenWorkflowState state = new CodeGenWorkflow().executeWorkflow(
                "做一个咖啡店的会员管理后台，包含会员列表、积分管理、订单记录和销售数据统计图表，需要 Logo 和系统架构介绍",
                TEST_VUE_APP_ID);
        printAndCheck(state);
        Assertions.assertTrue(state.buildResultDir().endsWith("dist"));
    }

    @Test
    void executeWorkflowWithFlux() {
        // 指定生成模式时跳过智能路由，流中包含节点进度和 AI 生成内容
        List<String> chunks = new CodeGenWorkflow()
                .executeWorkflowWithFlux("帮我做一个咖啡店官网，需要 Logo", TEST_MULTI_FILE_APP_ID, CodeGenTypeEnum.MULTI_FILE)
                .collectList()
                .block(Duration.ofMinutes(10));
        Assertions.assertNotNull(chunks);
        String output = String.join("", chunks);
        System.out.println(output);
        Assertions.assertTrue(output.contains("[工作流] 已收集"));
        Assertions.assertTrue(output.contains("[工作流] 代码质检"));
        Assertions.assertTrue(FileUtil.isNotEmpty(FileUtil.file(AppConstant.CODE_OUTPUT_ROOT_DIR,
                CodeGenTypeEnum.MULTI_FILE.getValue() + "_" + TEST_MULTI_FILE_APP_ID)));
    }

    private static void printAndCheck(CodeGenWorkflowState state) {
        Assertions.assertNotNull(state);
        for (ImageResource image : state.imageList()) {
            System.out.println(image.getCategory() + " | " + image.getDescription() + " | " + image.getUrl());
        }
        System.out.println("生成模式: " + state.generationType().getText());
        System.out.println("质检次数: " + state.qualityCheckCount() + "，最终结果: " + state.qualityResult());
        System.out.println("产物目录: " + state.buildResultDir());
        Assertions.assertTrue(FileUtil.isNotEmpty(FileUtil.file(state.buildResultDir())));
    }
}
