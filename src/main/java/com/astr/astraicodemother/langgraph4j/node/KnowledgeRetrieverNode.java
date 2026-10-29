package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.util.StrUtil;
import com.astr.astraicodemother.knowledge.CodeKnowledgeEnhancer;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Map;
import java.util.Optional;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 知识库检索节点：在智能路由确定生成模式后，对 Vue 工程模式执行 RAG 检索，
 * 将最匹配的风格规范和组件范例拼接到增强提示词中。
 */
@Slf4j
public class KnowledgeRetrieverNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            CodeGenTypeEnum generationType = state.generationType();
            if (generationType != CodeGenTypeEnum.VUE_PROJECT) {
                log.info("执行节点: 知识库检索，当前模式 {} 无需检索知识库，直接跳过",
                        generationType != null ? generationType.getText() : "未知");
                return Map.of();
            }

            log.info("执行节点: 知识库检索，开始为 Vue 工程模式检索最佳实践与组件范例");
            try {
                CodeKnowledgeEnhancer enhancer = SpringContextUtil.getBean(CodeKnowledgeEnhancer.class);
                Optional<String> knowledgeOpt = enhancer.enhanceKnowledge(state.originalPrompt(), generationType);
                if (knowledgeOpt.isPresent()) {
                    String currentPrompt = state.enhancedPrompt();
                    String newPrompt = StrUtil.isNotBlank(currentPrompt)
                            ? currentPrompt + "\n\n" + knowledgeOpt.get()
                            : knowledgeOpt.get();
                    return Map.of(CodeGenWorkflowState.ENHANCED_PROMPT, newPrompt);
                }
            } catch (Exception e) {
                log.warn("执行节点: 知识库检索异常，跳过知识注入: {}", e.getMessage(), e);
            }
            return Map.of();
        });
    }
}
