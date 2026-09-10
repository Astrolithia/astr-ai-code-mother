package com.astr.astraicodemother.util;

/**
 * 字符串工具类
 */
public class StringUtils {

    /**
     * 判断字符串是否为空白
     * <p>
     * null、空字符串、或仅包含空白字符时返回 true
     *
     * @param str 待判断字符串
     * @return 是否为空白
     */
    public static boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }
}
