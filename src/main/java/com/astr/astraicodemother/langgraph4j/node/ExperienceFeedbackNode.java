package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import com.astr.astraicodemother.knowledge.CodeFixDistillationService;
import com.astr.astraicodemother.knowledge.CodeFixExperience;
import com.astr.astraicodemother.knowledge.CodeKnowledgeRetriever;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 失败案例提炼与回流节点 (ExperienceFeedbackNode)：
 * 当代码经历了至少一轮质检修复且最终通过后触发，
 * 调用提炼 AI 从质检错误和修复背景中萃取原子级避坑规则，并动态写入向量知识库。
 */
@Slf4j
public class ExperienceFeedbackNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            List<String> failedErrors = state.lastFailedQualityErrors();
            int qualityCheckCount = state.qualityCheckCount();

            // 只有经历了至少一轮质检修复（checkCount > 1 且有历史错误记录）才回流经验
            if (qualityCheckCount <= 1 || CollUtil.isEmpty(failedErrors)) {
                log.info("执行节点: 经验回流，未经历质检修复循环，无需回流经验");
                return Map.of();
            }

            log.info("执行节点: 经验回流，开始提炼质检修复经验并回流向量库，历经质检轮数: {}，历史错误数: {}",
                    qualityCheckCount, failedErrors.size());

            try {
                CodeFixDistillationService distillationService = SpringContextUtil.getBean(CodeFixDistillationService.class);
                CodeKnowledgeRetriever retriever = SpringContextUtil.getBean(CodeKnowledgeRetriever.class);

                // 组装提炼上下文
                StringBuilder contextBuilder = new StringBuilder();
                contextBuilder.append("【用户业务需求】\n").append(state.originalPrompt()).append("\n\n");
                contextBuilder.append("【生成模式】\n").append(state.generationType() != null ? state.generationType().getText() : "Vue 工程模式").append("\n\n");
                contextBuilder.append("【质检发现的历史问题/报错】\n");
                for (String err : failedErrors) {
                    contextBuilder.append("- ").append(err).append("\n");
                }
                contextBuilder.append("\n【最终修复结果】\n代码经过修复已成功通过质检并完成构建。请提炼出通用的避坑经验。");

                CodeFixExperience experience = distillationService.distillExperience(contextBuilder.toString());
                if (experience != null && StrUtil.isNotBlank(experience.getScenario()) && StrUtil.isNotBlank(experience.getAvoidRule())) {
                    experience.setId("fix-" + (experience.getCategory() != null ? experience.getCategory().toLowerCase() : "general") + "-" + IdUtil.fastSimpleUUID());
                    experience.setCodeGenType(state.generationType() != null ? state.generationType() : CodeGenTypeEnum.VUE_PROJECT);
                    experience.setUiLib("ant-design-vue");
                    experience.setCreateTime(System.currentTimeMillis());

                    // 写入向量存储
                    retriever.ingestExperience(experience);
                    log.info("经验回流成功，id: {}, 场景: {}", experience.getId(), experience.getScenario());
                } else {
                    log.warn("经验提炼结果为空或缺少必要字段，跳过回流");
                }
            } catch (Exception e) {
                log.warn("执行节点: 经验回流异常，不阻断主流程: {}", e.getMessage(), e);
            }

            return Map.of();
        });
    }
}
