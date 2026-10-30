package com.astr.astraicodemother.langgraph4j;

import cn.hutool.json.JSONUtil;
import com.astr.astraicodemother.ai.model.message.AiResponseMessage;
import com.astr.astraicodemother.langgraph4j.hook.NodeRetryHook;
import com.astr.astraicodemother.langgraph4j.model.QualityResult;
import com.astr.astraicodemother.langgraph4j.node.CodeGeneratorNode;
import com.astr.astraicodemother.langgraph4j.node.CodeQualityCheckNode;
import com.astr.astraicodemother.langgraph4j.node.ContentImageCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.DiagramCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.ExperienceFeedbackNode;
import com.astr.astraicodemother.langgraph4j.node.IllustrationCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.ImageCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.KnowledgeRetrieverNode;
import com.astr.astraicodemother.langgraph4j.node.LogoCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.ProjectBuilderNode;
import com.astr.astraicodemother.langgraph4j.node.PromptEnhancerNode;
import com.astr.astraicodemother.langgraph4j.node.RouterNode;
import com.astr.astraicodemother.langgraph4j.node.VisualQualityCheckNode;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.CompiledGraph;
import org.bsc.langgraph4j.GraphInput;
import org.bsc.langgraph4j.GraphStateException;
import org.bsc.langgraph4j.NodeOutput;
import org.bsc.langgraph4j.RunnableConfig;
import org.bsc.langgraph4j.StateGraph;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;

/**
 * 代码生成工作流：图片收集 → 提示词增强 → 智能路由 → 代码生成 ⇄ 代码质检 →（Vue 工程）项目构建
 * <p>
 * 节点通过 SpringContextUtil 获取 Bean，需要在 Spring 容器启动后执行
 */
@Slf4j
public class CodeGenWorkflow {

    /**
     * 质检未通过时最多重新生成的轮数，避免 AI 反复判定失败导致死循环
     */
    private static final int MAX_FIX_ROUNDS = 2;

    /**
     * RunnableConfig 中流式输出通道的 key，代码生成节点据此转发 AI 输出
     */
    private static final String OUTPUT_SINK_KEY = "outputSink";

    /**
     * 创建并编译工作流
     */
    public CompiledGraph<CodeGenWorkflowState> createWorkflow() throws GraphStateException {
        return new StateGraph<>(CodeGenWorkflowState.SCHEMA, CodeGenWorkflowState::new)
                // 添加节点
                .addNode("image_collector", ImageCollectorNode.create())
                .addNode("content_image_collector", ContentImageCollectorNode.create())
                .addNode("illustration_collector", IllustrationCollectorNode.create())
                .addNode("diagram_collector", DiagramCollectorNode.create())
                .addNode("logo_collector", LogoCollectorNode.create())
                .addNode("prompt_enhancer", PromptEnhancerNode.create())
                .addNode("router", RouterNode.create())
                .addNode("knowledge_retriever", KnowledgeRetrieverNode.create())
                .addNode("code_generator", CodeGeneratorNode.create())
                .addNode("code_quality_check", CodeQualityCheckNode.create())
                .addNode("project_builder", ProjectBuilderNode.create())
                .addNode("visual_quality_check", VisualQualityCheckNode.create())
                .addNode("experience_feedback", ExperienceFeedbackNode.create())

                // 输入原始 Prompt
                .addEdge(START, "image_collector")
                // 图片素材收集：四路并行，汇合到提示词增强
                .addEdge("image_collector", "content_image_collector")
                .addEdge("image_collector", "illustration_collector")
                .addEdge("image_collector", "diagram_collector")
                .addEdge("image_collector", "logo_collector")
                .addEdge("content_image_collector", "prompt_enhancer")
                .addEdge("illustration_collector", "prompt_enhancer")
                .addEdge("diagram_collector", "prompt_enhancer")
                .addEdge("logo_collector", "prompt_enhancer")
                .addEdge("prompt_enhancer", "router")
                // 按路由选择的模式检索知识库并生成代码
                .addEdge("router", "knowledge_retriever")
                .addEdge("knowledge_retriever", "code_generator")
                .addEdge("code_generator", "code_quality_check")
                // 静态代码质检：未通过回到代码生成；通过后 Vue 进入构建，非 Vue 模式进入经验沉淀
                .addConditionalEdges("code_quality_check",
                        edge_async(CodeGenWorkflow::routeAfterQualityCheck),
                        Map.of(
                                "fail", "code_generator",
                                "build", "project_builder",
                                "skip_build", "experience_feedback"
                        ))
                // 项目构建完成后，执行真实无头浏览器渲染与视觉质检 (DOM 几何碰撞检测)
                .addEdge("project_builder", "visual_quality_check")
                // 视觉质检：发现重叠遮挡等缺陷时回到代码生成重修；通过后进入经验沉淀
                .addConditionalEdges("visual_quality_check",
                        edge_async(CodeGenWorkflow::routeAfterVisualCheck),
                        Map.of(
                                "fail", "code_generator",
                                "pass", "experience_feedback"
                        ))
                .addEdge("experience_feedback", END)
                // 调用 AI 的节点失败时按节点重试；路由节点的模型同时服务创建应用接口，保留模型层自带的重试
                .addWrapCallNodeHook("image_collector", NodeRetryHook.withFallback(state -> {
                    // 规划失败不阻断代码生成，后续节点按空计划跳过
                    return Map.of();
                }))
                .addWrapCallNodeHook("knowledge_retriever", NodeRetryHook.withFallback(state -> {
                    log.warn("知识库检索失败，跳过知识注入");
                    return Map.of();
                }))
                .addWrapCallNodeHook("experience_feedback", NodeRetryHook.withFallback(state -> {
                    log.warn("经验回流节点执行失败，跳过经验沉淀");
                    return Map.of();
                }))
                .addWrapCallNodeHook("visual_quality_check", NodeRetryHook.withFallback(state -> {
                    log.warn("视觉质检节点执行失败，跳过视觉检查");
                    return Map.of();
                }))
                .addWrapCallNodeHook("code_generator", NodeRetryHook.retry())
                .addWrapCallNodeHook("code_quality_check", NodeRetryHook.withFallback(state -> Map.of(
                        // 质检本身出错不阻断流程，按通过处理
                        CodeGenWorkflowState.QUALITY_RESULT, QualityResult.builder().isValid(true).build(),
                        CodeGenWorkflowState.QUALITY_CHECK_COUNT, state.qualityCheckCount() + 1
                )))
                // 编译工作流
                .compile();
    }

    /**
     * 执行工作流，由智能路由节点选择生成模式
     *
     * @param originalPrompt 原始提示词
     * @param appId          应用 ID，决定代码输出目录和对话记忆
     * @return 最终状态
     */
    public CodeGenWorkflowState executeWorkflow(String originalPrompt, Long appId) throws GraphStateException {
        return execute(originalPrompt, appId, null, null);
    }

    /**
     * 流式执行工作流：输出节点进度和 AI 生成内容，格式与 AiCodeGeneratorFacade 的流一致，可直接交给对应的流处理器
     *
     * @param originalPrompt 原始提示词
     * @param appId          应用 ID
     * @param generationType 生成模式，跳过智能路由；Vue 工程模式的流是 JSON 消息，进度也需按此包装，因此必须事先确定
     * @return 流式输出
     */
    public Flux<String> executeWorkflowWithFlux(String originalPrompt, Long appId, CodeGenTypeEnum generationType) {
        Objects.requireNonNull(generationType, "流式执行需要事先确定生成模式");
        return Flux.create(sink -> Thread.ofVirtual().name("code-gen-workflow-" + appId).start(() -> {
            try {
                execute(originalPrompt, appId, generationType, sink);
                sink.complete();
            } catch (Exception e) {
                log.error("代码生成工作流执行失败，appId: {}", appId, e);
                sink.error(e);
            }
        }));
    }

    /**
     * 获取流式输出通道，非流式执行时返回 null
     */
    @SuppressWarnings("unchecked")
    public static FluxSink<String> getOutputSink(RunnableConfig config) {
        return (FluxSink<String>) config.metadata(OUTPUT_SINK_KEY).orElse(null);
    }

    private CodeGenWorkflowState execute(String originalPrompt, Long appId, CodeGenTypeEnum generationType,
                                         FluxSink<String> outputSink) throws GraphStateException {
        CompiledGraph<CodeGenWorkflowState> workflow = createWorkflow();
        Map<String, Object> inputs = new HashMap<>();
        inputs.put(CodeGenWorkflowState.ORIGINAL_PROMPT, originalPrompt);
        inputs.put(CodeGenWorkflowState.APP_ID, appId);
        if (generationType != null) {
            inputs.put(CodeGenWorkflowState.GENERATION_TYPE, generationType);
        }
        CodeGenWorkflowState finalState = null;
        int stepCounter = 1;
        log.info("开始执行代码生成工作流");
        emitProgress(outputSink, generationType, "正在收集图片素材…");
        // 图片收集的四路分支都是 IO 密集型，用虚拟线程并行执行
        try (ExecutorService imageCollectExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            RunnableConfig.Builder configBuilder = RunnableConfig.builder()
                    .addParallelNodeExecutor("image_collector", imageCollectExecutor);
            if (outputSink != null) {
                configBuilder.putMetadata(OUTPUT_SINK_KEY, outputSink);
            }
            for (NodeOutput<CodeGenWorkflowState> step : workflow.stream(GraphInput.args(inputs), configBuilder.build())) {
                log.info("--- 第 {} 步完成: {} ---", stepCounter++, step.node());
                finalState = step.state();
                String progress = describeStep(step.node(), finalState);
                if (progress != null) {
                    emitProgress(outputSink, finalState.generationType(), progress);
                }
            }
        }
        log.info("代码生成工作流执行完成");
        return finalState;
    }

    /**
     * 节点完成后需要告知用户的进度，无需告知时返回 null
     */
    private static String describeStep(String node, CodeGenWorkflowState state) {
        return switch (node) {
            case "prompt_enhancer" -> "已收集 %d 张图片素材，开始生成代码".formatted(state.imageList().size());
            case "knowledge_retriever" -> state.generationType() == CodeGenTypeEnum.VUE_PROJECT
                    ? "已匹配组件库最佳实践与设计规范"
                    : null;
            case "experience_feedback" -> state.qualityCheckCount() > 1 && !state.lastFailedQualityErrors().isEmpty()
                    ? "已提炼本次质检修复经验并回流知识库"
                    : null;
            case "code_quality_check" -> describeQualityCheck(state);
            case "visual_quality_check" -> describeVisualCheck(state);
            case "project_builder" -> state.buildResultDir().endsWith("dist") ? "项目构建完成" : "项目构建失败";
            default -> null;
        };
    }

    private static String describeVisualCheck(CodeGenWorkflowState state) {
        QualityResult qualityResult = state.qualityResult();
        if (qualityResult == null || !qualityResult.needsFix()) {
            return "视觉质检通过，页面排版与交互元素无物理遮挡";
        }
        StringBuilder progress = new StringBuilder("视觉质检发现以下排版缺陷，正在修复：");
        qualityResult.getErrors().forEach(error -> progress.append("\n- ").append(error));
        return progress.toString();
    }

    private static String describeQualityCheck(CodeGenWorkflowState state) {
        QualityResult qualityResult = state.qualityResult();
        if (qualityResult == null || !qualityResult.needsFix()) {
            return "代码质检通过";
        }
        StringBuilder progress = new StringBuilder(needsRegenerate(state)
                ? "代码质检发现以下问题，正在修复："
                : "代码质检仍有以下问题，已达到最大修复轮数：");
        qualityResult.getErrors().forEach(error -> progress.append("\n- ").append(error));
        return progress.toString();
    }

    /**
     * 输出进度：Vue 工程模式的流是 JSON 消息，需要包装成 AI 回复消息
     */
    public static void emitProgress(FluxSink<String> outputSink, CodeGenTypeEnum generationType, String progress) {
        if (outputSink == null) {
            return;
        }
        String text = "\n\n[工作流] " + progress + "\n\n";
        outputSink.next(generationType == CodeGenTypeEnum.VUE_PROJECT
                ? JSONUtil.toJsonStr(new AiResponseMessage(text))
                : text);
    }

    private static boolean needsRegenerate(CodeGenWorkflowState state) {
        QualityResult qualityResult = state.qualityResult();
        return qualityResult != null && qualityResult.needsFix() && state.qualityCheckCount() <= MAX_FIX_ROUNDS;
    }

    /**
     * 静态质检后的路由：未通过且未超过修复轮数时重新生成，通过后 Vue 进入构建，其余模式跳过构建
     */
    private static String routeAfterQualityCheck(CodeGenWorkflowState state) {
        if (needsRegenerate(state)) {
            log.warn("代码静态质检未通过，重新生成代码");
            return "fail";
        }
        if (state.qualityResult() != null && state.qualityResult().needsFix()) {
            log.warn("代码静态质检仍未通过，已达到最大修复轮数 {}，继续后续流程", MAX_FIX_ROUNDS);
        }
        return state.generationType() == CodeGenTypeEnum.VUE_PROJECT ? "build" : "skip_build";
    }

    /**
     * 视觉质检后的路由：发现元素重叠等缺陷且未达到上限时打回重修，否则进入经验回流与交付
     */
    private static String routeAfterVisualCheck(CodeGenWorkflowState state) {
        if (needsRegenerate(state)) {
            log.warn("视觉质检未通过（发现物理遮挡或布局溢出），重新生成代码修复视觉缺陷");
            return "fail";
        }
        return "pass";
    }
}
