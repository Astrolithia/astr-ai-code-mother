package com.astr.astraicodemother.langgraph4j.state;

import com.astr.astraicodemother.langgraph4j.model.ImageCollectionPlan;
import com.astr.astraicodemother.langgraph4j.model.ImageResource;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import org.bsc.langgraph4j.state.AgentState;
import org.bsc.langgraph4j.state.Channel;
import org.bsc.langgraph4j.state.Channels;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 代码生成工作流状态
 */
public class CodeGenWorkflowState extends AgentState {

    /**
     * 原始提示词
     */
    public static final String ORIGINAL_PROMPT = "originalPrompt";

    /**
     * 图片收集计划
     */
    public static final String IMAGE_COLLECTION_PLAN = "imageCollectionPlan";

    /**
     * 收集到的图片素材
     */
    public static final String IMAGE_LIST = "imageList";

    /**
     * 增强后的提示词
     */
    public static final String ENHANCED_PROMPT = "enhancedPrompt";

    /**
     * 生成模式
     */
    public static final String GENERATION_TYPE = "generationType";

    /**
     * 计划生成的文件
     */
    public static final String PLANNED_FILES = "plannedFiles";

    /**
     * 生成代码所在目录
     */
    public static final String GENERATED_CODE_DIR = "generatedCodeDir";

    /**
     * 已保存的文件
     */
    public static final String SAVED_FILES = "savedFiles";

    /**
     * 构建产物目录
     */
    public static final String BUILD_RESULT_DIR = "buildResultDir";

    /**
     * 图片列表使用追加通道，四路并行收集的结果会合并到一起；未声明的 key 默认为覆盖
     */
    public static final Map<String, Channel<?>> SCHEMA = Map.of(
            IMAGE_LIST, Channels.appender(ArrayList::new)
    );

    public CodeGenWorkflowState(Map<String, Object> initData) {
        super(initData);
    }

    public String originalPrompt() {
        return this.<String>value(ORIGINAL_PROMPT).orElse("");
    }

    /**
     * 规划失败时返回空计划，各图片收集节点直接跳过
     */
    public ImageCollectionPlan imageCollectionPlan() {
        return this.<ImageCollectionPlan>value(IMAGE_COLLECTION_PLAN).orElseGet(ImageCollectionPlan::new);
    }

    public List<ImageResource> imageList() {
        return this.<List<ImageResource>>value(IMAGE_LIST).orElse(List.of());
    }

    public String enhancedPrompt() {
        return this.<String>value(ENHANCED_PROMPT).orElse("");
    }

    public CodeGenTypeEnum generationType() {
        return this.<CodeGenTypeEnum>value(GENERATION_TYPE).orElse(null);
    }

    public List<String> plannedFiles() {
        return this.<List<String>>value(PLANNED_FILES).orElse(List.of());
    }

    public String generatedCodeDir() {
        return this.<String>value(GENERATED_CODE_DIR).orElse("");
    }

    public List<String> savedFiles() {
        return this.<List<String>>value(SAVED_FILES).orElse(List.of());
    }

    public String buildResultDir() {
        return this.<String>value(BUILD_RESULT_DIR).orElse("");
    }
}
