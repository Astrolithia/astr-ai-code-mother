package com.astr.astraicodemother.langgraph4j;

import com.astr.astraicodemother.langgraph4j.node.CodeGeneratorNode;
import com.astr.astraicodemother.langgraph4j.node.ContentImageCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.DiagramCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.FileSaverNode;
import com.astr.astraicodemother.langgraph4j.node.HtmlGeneratorNode;
import com.astr.astraicodemother.langgraph4j.node.IllustrationCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.ImageCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.LogoCollectorNode;
import com.astr.astraicodemother.langgraph4j.node.MultiFileGeneratorNode;
import com.astr.astraicodemother.langgraph4j.node.PackageBuilderNode;
import com.astr.astraicodemother.langgraph4j.node.ProjectBuilderNode;
import com.astr.astraicodemother.langgraph4j.node.PromptEnhancerNode;
import com.astr.astraicodemother.langgraph4j.node.RouterNode;
import com.astr.astraicodemother.langgraph4j.node.VueProjectGeneratorNode;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.CompiledGraph;
import org.bsc.langgraph4j.GraphInput;
import org.bsc.langgraph4j.GraphStateException;
import org.bsc.langgraph4j.NodeOutput;
import org.bsc.langgraph4j.RunnableConfig;
import org.bsc.langgraph4j.StateGraph;

import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;

/**
 * 代码生成工作流：图片收集节点已接入真实工具，其余节点仍为 Mock
 * <p>
 * 节点通过 SpringContextUtil 获取 Bean，需要在 Spring 容器启动后执行
 */
@Slf4j
public class CodeGenWorkflow {

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
                .addNode("html_generator", HtmlGeneratorNode.create())
                .addNode("multi_file_generator", MultiFileGeneratorNode.create())
                .addNode("vue_project_generator", VueProjectGeneratorNode.create())
                .addNode("code_generator", CodeGeneratorNode.create())
                .addNode("project_builder", ProjectBuilderNode.create())
                .addNode("file_saver", FileSaverNode.create())
                .addNode("package_builder", PackageBuilderNode.create())

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
                // 选择生成模式
                .addConditionalEdges("router",
                        edge_async(state -> state.generationType().getValue()),
                        Map.of(
                                CodeGenTypeEnum.HTML.getValue(), "html_generator",
                                CodeGenTypeEnum.MULTI_FILE.getValue(), "multi_file_generator",
                                CodeGenTypeEnum.VUE_PROJECT.getValue(), "vue_project_generator"
                        ))
                .addEdge("html_generator", "code_generator")
                .addEdge("multi_file_generator", "code_generator")
                .addEdge("vue_project_generator", "code_generator")
                .addEdge("code_generator", "project_builder")
                // 项目构建：文件保存与打包构建并行，汇合后完成
                .addEdge("project_builder", "file_saver")
                .addEdge("project_builder", "package_builder")
                .addEdge("file_saver", END)
                .addEdge("package_builder", END)
                // 编译工作流
                .compile();
    }

    /**
     * 执行工作流
     *
     * @param originalPrompt 原始提示词
     * @return 最终状态
     */
    public CodeGenWorkflowState executeWorkflow(String originalPrompt) throws GraphStateException {
        CompiledGraph<CodeGenWorkflowState> workflow = createWorkflow();
        GraphInput input = GraphInput.args(Map.of(CodeGenWorkflowState.ORIGINAL_PROMPT, originalPrompt));
        CodeGenWorkflowState finalState = null;
        int stepCounter = 1;
        log.info("开始执行代码生成工作流");
        // 图片收集的四路分支都是 IO 密集型，用虚拟线程并行执行
        try (ExecutorService imageCollectExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            RunnableConfig config = RunnableConfig.builder()
                    .addParallelNodeExecutor("image_collector", imageCollectExecutor)
                    .build();
            for (NodeOutput<CodeGenWorkflowState> step : workflow.stream(input, config)) {
                log.info("--- 第 {} 步完成: {} ---", stepCounter++, step.node());
                finalState = step.state();
            }
        }
        log.info("代码生成工作流执行完成");
        return finalState;
    }
}
