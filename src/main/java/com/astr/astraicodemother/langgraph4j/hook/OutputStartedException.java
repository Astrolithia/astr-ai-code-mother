package com.astr.astraicodemother.langgraph4j.hook;

/**
 * 节点已向调用方输出部分内容后失败：输出无法撤回，重试会导致重复内容，因此不可重试
 */
public class OutputStartedException extends RuntimeException {

    public OutputStartedException(String message, Throwable cause) {
        super(message, cause);
    }
}
