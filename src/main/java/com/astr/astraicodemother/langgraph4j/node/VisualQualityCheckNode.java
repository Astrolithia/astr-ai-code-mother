package com.astr.astraicodemother.langgraph4j.node;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.io.FileUtil;
import com.astr.astraicodemother.langgraph4j.model.QualityResult;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.langgraph4j.visual.VisualQualityChecker;
import com.astr.astraicodemother.langgraph4j.visual.VisualQualityResult;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import com.astr.astraicodemother.util.SpringContextUtil;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 视觉质检节点 (VisualQualityCheckNode)：
 * 在项目构建出 dist 产物后执行真实无头浏览器渲染，
 * 捕捉 CSS 盒模型坍塌、按钮与文字遮挡、横向溢出等纯代码审查无法发现的视觉缺陷。
 */
@Slf4j
public class VisualQualityCheckNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            // 仅对已完成打包并拥有 dist 产物的 Vue 工程进行视觉检测
            if (state.generationType() != CodeGenTypeEnum.VUE_PROJECT) {
                return Map.of();
            }

            String distDir = state.buildResultDir();
            if (!distDir.endsWith("dist") || !FileUtil.isDirectory(distDir)) {
                log.warn("执行节点: 视觉质检，未找到有效构建产物目录，跳过视觉质检: {}", distDir);
                return Map.of();
            }

            log.info("执行节点: 视觉质检，开始进行无头渲染与物理几何碰撞检测");
            VisualQualityChecker checker = SpringContextUtil.getBean(VisualQualityChecker.class);
            VisualQualityResult visualResult = checker.inspect(distDir, null);

            if (visualResult != null && visualResult.hasVisualDefects()) {
                log.warn("视觉质检未通过，发现 {} 处视觉缺陷", visualResult.getVisualErrors().size());

                // 汇总视觉缺陷并注入 QualityResult 打回重修循环
                List<String> combinedErrors = new ArrayList<>(visualResult.getVisualErrors());
                List<String> combinedSuggestions = new ArrayList<>();
                if (CollUtil.isNotEmpty(visualResult.getSuggestions())) {
                    combinedSuggestions.addAll(visualResult.getSuggestions());
                }

                QualityResult newQuality = QualityResult.builder()
                        .isValid(false)
                        .errors(combinedErrors)
                        .suggestions(combinedSuggestions)
                        .build();

                Map<String, Object> updates = new HashMap<>();
                updates.put(CodeGenWorkflowState.QUALITY_RESULT, newQuality);
                updates.put(CodeGenWorkflowState.LAST_FAILED_QUALITY_ERRORS, combinedErrors);
                return updates;
            }

            log.info("视觉质检通过，未发现物理重叠与视口溢出问题");
            return Map.of();
        });
    }
}
