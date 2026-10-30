package com.astr.astraicodemother.langgraph4j.visual;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 视觉质检结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisualQualityResult implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否通过视觉质检
     */
    private Boolean isValid;

    /**
     * 发现的视觉缺陷与遮挡错误列表
     */
    private List<String> visualErrors;

    /**
     * 针对该视觉问题的具体修复建议 (例如增加 margin/padding、声明 BFC 等)
     */
    private List<String> suggestions;

    /**
     * 渲染快照截图路径 (留证与供多模态模型查看)
     */
    private String screenshotPath;

    public boolean hasVisualDefects() {
        return Boolean.FALSE.equals(isValid) && visualErrors != null && !visualErrors.isEmpty();
    }
}
