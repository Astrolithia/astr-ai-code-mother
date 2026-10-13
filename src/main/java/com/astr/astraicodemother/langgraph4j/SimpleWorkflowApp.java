package com.astr.astraicodemother.langgraph4j;

import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.CompiledGraph;
import org.bsc.langgraph4j.GraphInput;
import org.bsc.langgraph4j.GraphStateException;
import org.bsc.langgraph4j.NodeOutput;
import org.bsc.langgraph4j.RunnableConfig;
import org.bsc.langgraph4j.StateGraph;
import org.bsc.langgraph4j.action.AsyncNodeAction;
import org.bsc.langgraph4j.prebuilt.MessagesState;

import java.util.Map;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncEdgeAction.edge_async;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 代码生成工作流（仅搭建结构，节点不含真实业务逻辑）
 * <p>
 * 流程：
 * 输入原始 Prompt -> 图片素材收集（内容图片 / 插画 / 架构图 / Logo 并行）-> 提示词增强
 * -> 智能路由（HTML / 多文件 / Vue 三选一）-> 网站生成 -> 项目构建（文件保存 / 打包构建 并行）-> 完成
 */
@Slf4j
public class SimpleWorkflowApp {

    /**
     * 状态中保存生成模式的 key
     */
    static final String GENERATION_TYPE_KEY = "generationType";

    /**
     * 创建一个只输出一句信息的工作节点
     */
    static AsyncNodeAction<MessagesState<String>> makeNode(String message) {
        return node_async(state -> {
            log.info("执行节点: {}", message);
            return Map.of("messages", message);
        });
    }

    public static void main(String[] args) throws GraphStateException {
        CompiledGraph<MessagesState<String>> workflow = new StateGraph<MessagesState<String>>(MessagesState.SCHEMA, MessagesState::new)
                // 图片素材收集
                .addNode("image_collector", makeNode("图片素材收集 Agent"))
                .addNode("content_image_collector", makeNode("内容图片：Pexels 网页搜索"))
                .addNode("illustration_collector", makeNode("插画图片：Undraw 抓取"))
                .addNode("diagram_collector", makeNode("架构图：文本绘图 + 上传到 COS"))
                .addNode("logo_collector", makeNode("Logo 设计图片：AI 生成或 MCP"))
                // 提示词增强
                .addNode("prompt_enhancer", makeNode("提示词增强"))
                // 智能路由，先固定选择 Vue 模式
                .addNode("router", node_async(state -> {
                    log.info("执行节点: 智能路由 Agent");
                    return Map.of("messages", "智能路由 Agent", GENERATION_TYPE_KEY, "vue");
                }))
                .addNode("html_generator", makeNode("原生 HTML 模式"))
                .addNode("multi_file_generator", makeNode("原生多文件模式"))
                .addNode("vue_project_generator", makeNode("Vue 工程模式"))
                // 网站生成
                .addNode("code_generator", makeNode("网站生成 Agent"))
                // 项目构建
                .addNode("project_builder", makeNode("项目构建器"))
                .addNode("file_saver", makeNode("文件保存"))
                .addNode("package_builder", makeNode("打包构建"))

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
                        edge_async(state -> state.<String>value(GENERATION_TYPE_KEY).orElse("html")),
                        Map.of(
                                "html", "html_generator",
                                "multi_file", "multi_file_generator",
                                "vue", "vue_project_generator"
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

        log.info("开始执行工作流");
        int stepCounter = 1;
        for (NodeOutput<MessagesState<String>> step : workflow.stream(GraphInput.noArgs(), RunnableConfig.builder().build())) {
            log.info("--- 第 {} 步完成 ---", stepCounter++);
            log.info("步骤输出: {}", step);
        }
        log.info("工作流执行完成");
    }
}
