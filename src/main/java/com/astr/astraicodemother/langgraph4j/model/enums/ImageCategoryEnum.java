package com.astr.astraicodemother.langgraph4j.model.enums;

import lombok.Getter;

/**
 * 图片素材类别枚举
 */
@Getter
public enum ImageCategoryEnum {

    CONTENT("内容图片", "content"),
    ILLUSTRATION("插画图片", "illustration"),
    ARCHITECTURE("架构图", "architecture"),
    LOGO("Logo 设计图片", "logo");

    private final String text;
    private final String value;

    ImageCategoryEnum(String text, String value) {
        this.text = text;
        this.value = value;
    }
}
