package com.astr.astraicodemother.langgraph4j;

import cn.hutool.core.io.FileUtil;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import org.bsc.langgraph4j.GraphStateException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

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

    private static void printAndCheck(CodeGenWorkflowState state) {
        Assertions.assertNotNull(state);
        for (ImageResource image : state.imageList()) {
            System.out.println(image.getCategory() + " | " + image.getDescription() + " | " + image.getUrl());
        }
        System.out.println("生成模式: " + state.generationType().getText());
        System.out.println("产物目录: " + state.buildResultDir());
        Assertions.assertTrue(FileUtil.isNotEmpty(FileUtil.file(state.buildResultDir())));
    }
}
