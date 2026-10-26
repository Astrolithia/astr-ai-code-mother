package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.ai.AiCodeGenTypeRoutingService;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 智能路由节点：未指定生成模式时，由 AI 根据用户需求选择
 */
@Slf4j
public class RouterNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            // 应用创建时已确定生成模式的，沿用该模式，保证预览和部署目录稳定
            if (state.generationType() != null) {
                log.info("执行节点: 智能路由，沿用已指定的生成模式: {}", state.generationType().getText());
                return Map.of();
            }
            CodeGenTypeEnum generationType;
            try {
                AiCodeGenTypeRoutingService routingService = SpringContextUtil.getBean(AiCodeGenTypeRoutingService.class);
                // 用原始提示词判断，增强提示词中的图片素材与生成模式无关
                generationType = routingService.routeCodeGenType(state.originalPrompt());
            } catch (Exception e) {
                // 路由失败时降级为最简单的 HTML 模式，保证工作流能继续执行
                log.error("智能路由失败，降级为 HTML 模式: {}", e.getMessage(), e);
                generationType = CodeGenTypeEnum.HTML;
            }
            log.info("执行节点: 智能路由，选择生成模式: {}", generationType.getText());
            return Map.of(CodeGenWorkflowState.GENERATION_TYPE, generationType);
        });
    }
}
