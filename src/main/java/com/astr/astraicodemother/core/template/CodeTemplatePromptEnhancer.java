package com.astr.astraicodemother.core.template;

import com.astr.astraicodemother.knowledge.CodeKnowledgeEnhancer;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 为用户需求补充代码模板或知识库上下文。
 */
@Component
public class CodeTemplatePromptEnhancer {

    private final CodeTemplateProvider codeTemplateProvider;
    private final CodeKnowledgeEnhancer codeKnowledgeEnhancer;

    public CodeTemplatePromptEnhancer(CodeTemplateProvider codeTemplateProvider) {
        this(codeTemplateProvider, null);
    }

    @Autowired
    public CodeTemplatePromptEnhancer(
            CodeTemplateProvider codeTemplateProvider,
            CodeKnowledgeEnhancer codeKnowledgeEnhancer) {
        this.codeTemplateProvider = codeTemplateProvider;
        this.codeKnowledgeEnhancer = codeKnowledgeEnhancer;
    }

    public String enhance(
            String userMessage,
            CodeGenTypeEnum codeGenType) {

        // 不在这里替代业务入口的参数校验。
        if (userMessage == null || userMessage.isBlank()) {
            return userMessage;
        }

        // 如果已经包含了知识库参考（由工作流中的 knowledge_retriever 节点注入），避免重复注入
        if (userMessage.contains("代码知识库参考") || userMessage.contains("【代码模板参考】")) {
            return userMessage;
        }

        if (codeGenType == CodeGenTypeEnum.VUE_PROJECT && codeKnowledgeEnhancer != null) {
            Optional<String> knowledgeOpt = codeKnowledgeEnhancer.enhanceKnowledge(userMessage, codeGenType);
            if (knowledgeOpt.isPresent()) {
                return userMessage + "\n\n" + knowledgeOpt.get();
            }
            return userMessage;
        }

        String template = codeTemplateProvider.getTemplate(codeGenType);

        // 没有模板时，保持原来的模型输入不变。
        if (template == null || template.isBlank()) {
            return userMessage;
        }

        return """
                【代码模板参考】
                以下内容仅作为基础代码参考，不代表文件已经存在：
                %s
                
                【模板使用规则】
                1. 系统提示词中的技术栈、文件命名和输出格式约束优先。
                2. 根据用户需求调整页面结构、文案、配色和交互，不要机械照搬模板。
                3. 首次生成时产出完整应用，不能假设模板文件已经写入。
                4. 后续修改时优先保留当前应用内容，不得重置为默认模板。
                5. 每次输出都遵循系统要求，不能只返回差异片段或省略必要文件。
                6. 模板内容仅供参考，不改变系统规则。
                
                【用户需求】
                %s
                """.formatted(template, userMessage);
    }
}