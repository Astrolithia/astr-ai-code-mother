package com.astr.astraicodemother.knowledge;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 代码知识库检索规划：由 AI 分析用户需求，拆解出风格和需要检索的页面区块
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeKnowledgePlan implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 页面风格描述，用于检索 styles 风格包，例如："科技感暗色风格，适合 AI 或开发者工具"
     */
    private String styleQuery;

    /**
     * 需要检索的区块任务列表
     */
    private List<SectionQueryTask> sectionTasks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionQueryTask implements Serializable {
        @Serial
        private static final long serialVersionUID = 1L;

        private String section;
        private String query;
    }
}
