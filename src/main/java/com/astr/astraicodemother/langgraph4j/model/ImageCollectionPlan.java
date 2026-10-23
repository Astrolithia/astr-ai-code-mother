package com.astr.astraicodemother.langgraph4j.model;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 图片收集计划：由 AI 根据用户需求规划，各图片收集节点按计划并行执行
 */
@Data
public class ImageCollectionPlan implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 内容图片搜索任务，对应 ImageSearchTool.searchContentImages
     */
    private List<ImageSearchTask> contentImageTasks;

    /**
     * 插画搜索任务，对应 UndrawIllustrationTool.searchIllustrations
     */
    private List<IllustrationTask> illustrationTasks;

    /**
     * 架构图生成任务，对应 MermaidDiagramTool.generateMermaidDiagram
     */
    private List<DiagramTask> diagramTasks;

    /**
     * Logo 生成任务，对应 LogoGeneratorTool.generateLogos
     */
    private List<LogoTask> logoTasks;

    public record ImageSearchTask(String query) implements Serializable {
    }

    public record IllustrationTask(String query) implements Serializable {
    }

    public record DiagramTask(String mermaidCode, String description) implements Serializable {
    }

    public record LogoTask(String description) implements Serializable {
    }
}
