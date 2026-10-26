package com.astr.astraicodemother.langgraph4j.model;

import cn.hutool.core.collection.CollUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 代码质量检查结果
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QualityResult implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * 是否通过质检
     */
    private Boolean isValid;

    /**
     * 必须修复的错误
     */
    private List<String> errors;

    /**
     * 改进建议
     */
    private List<String> suggestions;

    /**
     * 是否需要带着错误信息重新生成：未通过且给出了具体错误才有修复依据
     */
    public boolean needsFix() {
        return Boolean.FALSE.equals(isValid) && CollUtil.isNotEmpty(errors);
    }
}
