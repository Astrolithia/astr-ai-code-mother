package com.astr.astraicodemother.langgraph4j;

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

    @Test
    void executeWorkflow() throws GraphStateException {
        CodeGenWorkflowState state = new CodeGenWorkflow().executeWorkflow("帮我做一个咖啡店官网，需要 Logo 和门店系统架构介绍");
        Assertions.assertNotNull(state);
        for (ImageResource image : state.imageList()) {
            System.out.println(image.getCategory() + " | " + image.getDescription() + " | " + image.getUrl());
        }
    }
}
