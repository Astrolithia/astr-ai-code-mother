package com.astr.astraicodemother.core.parser;

/**
 * 代码解析器策略接口
 */
public interface CodeParser<T> {

    /**
     * 解析代码内容
     * 
     * @param codeContent 原始代码内容
     * @return 解析后的结果对象
     */
    T parseCode(String codeContent);

    /**
     * 判断流式内容中所需的代码块是否都已闭合（闭合后再追加内容不会改变解析结果）
     *
     * @param codeContent 当前已接收的内容
     * @return 是否可以提前解析并保存
     */
    boolean isCodeComplete(String codeContent);
}
