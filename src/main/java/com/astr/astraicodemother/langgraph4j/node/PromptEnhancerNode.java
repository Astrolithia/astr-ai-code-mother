package com.astr.astraicodemother.langgraph4j.node;

import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeAction;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 提示词增强节点：把收集到的图片素材拼接到原始提示词中，作为网站素材交给代码生成
 */
@Slf4j
public class PromptEnhancerNode {

    public static AsyncNodeAction<CodeGenWorkflowState> create() {
        return node_async(state -> {
            List<ImageResource> imageList = state.imageList();
            log.info("执行节点: 提示词增强，共 {} 张图片素材", imageList.size());
            StringBuilder enhancedPrompt = new StringBuilder(state.originalPrompt());
            if (!imageList.isEmpty()) {
                enhancedPrompt.append("\n\n## 可用素材资源\n")
                        .append("请在生成网站使用以下图片资源，将这些图片合理地嵌入到网站的相应位置中。\n");
                // 四路并行收集的结果顺序不固定，按类别排序让同类素材挨在一起
                imageList.stream()
                        .sorted(Comparator.comparing(ImageResource::getCategory))
                        .forEach(image -> enhancedPrompt.append("- ")
                                .append(image.getCategory().getText())
                                .append("：")
                                .append(image.getDescription())
                                .append("（")
                                .append(image.getUrl())
                                .append("）\n"));
            }
            log.info("提示词增强完成，增强后长度: {} 字符", enhancedPrompt.length());
            return Map.of(CodeGenWorkflowState.ENHANCED_PROMPT, enhancedPrompt.toString());
        });
    }
}
