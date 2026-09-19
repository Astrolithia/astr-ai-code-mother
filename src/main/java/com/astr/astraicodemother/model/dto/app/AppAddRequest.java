package com.astr.astraicodemother.model.dto.app;

import lombok.Data;

import java.io.Serializable;

/**
 * 应用创建请求。
 *
 * @author Astrolithia
 */
@Data
public class AppAddRequest implements Serializable {

    /**
     * 应用初始化的 prompt（必填）
     */
    private String initPrompt;

    private static final long serialVersionUID = 1L;
}
