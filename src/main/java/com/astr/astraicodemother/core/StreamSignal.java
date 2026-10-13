package com.astr.astraicodemother.core;

/**
 * 混在 HTML / MULTI_FILE 文本代码流中的控制信号
 * 信号不是 AI 输出：文本流处理器不会把它写入对话历史，Controller 会把它转换为具名 SSE 事件
 */
public final class StreamSignal {

    /**
     * 代码文件已保存，前端可以立即加载预览（此时 AI 可能仍在输出代码块之后的说明文字）
     */
    public static final String FILES_READY = "\u0000files-ready\u0000";

    /**
     * FILES_READY 对应的 SSE 事件名
     */
    public static final String FILES_READY_EVENT = "files-ready";

    private StreamSignal() {
    }

    public static boolean isSignal(String chunk) {
        return FILES_READY.equals(chunk);
    }
}
