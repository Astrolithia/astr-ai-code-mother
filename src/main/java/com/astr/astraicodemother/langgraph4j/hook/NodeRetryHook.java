package com.astr.astraicodemother.langgraph4j.hook;

import com.astr.astraicodemother.langgraph4j.CodeGenWorkflow;
import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import dev.langchain4j.exception.NonRetriableException;
import dev.langchain4j.exception.RetriableException;
import lombok.extern.slf4j.Slf4j;
import org.bsc.langgraph4j.action.AsyncNodeActionWithConfig;
import org.bsc.langgraph4j.hook.NodeHook;
import org.bsc.langgraph4j.hook.RetryPolicy;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;

/**
 * 节点重试钩子：在 LangGraph4j 自带的 RetryPolicy 外再包一层，补上重试进度提示和最终降级
 * <p>
 * 模型层的重试已关闭（langchain4j.open-ai.chat-model.max-retries: 0），AI 调用失败统一在这里按节点重试
 */
@Slf4j
public class NodeRetryHook {

    /**
     * 最多调用 3 次，间隔 2s、4s（带抖动，上限 10s）
     */
    private static final RetryPolicy RETRY_POLICY = RetryPolicy.builder()
            .maxAttempts(3)
            .retryDelay(Duration.ofSeconds(2))
            .backoffFactor(2)
            .maxInterval(Duration.ofSeconds(10))
            .retryOn(NodeRetryHook::isRetryable)
            .build();

    /**
     * 只重试，最终失败时异常继续上抛，工作流失败
     */
    public static NodeHook.WrapCall<CodeGenWorkflowState> retry() {
        return withFallback(null);
    }

    /**
     * 重试，最终失败时执行降级，工作流继续
     *
     * @param fallback 根据当前状态返回降级后的节点输出，为 null 时不降级
     */
    public static NodeHook.WrapCall<CodeGenWorkflowState> withFallback(
            Function<CodeGenWorkflowState, Map<String, Object>> fallback) {
        NodeHook.WrapCall<CodeGenWorkflowState> retryHook = RETRY_POLICY.asHook();
        return (nodeId, state, config, action) -> {
            AtomicInteger attempt = new AtomicInteger();
            // 包一层计数，让重试过程对日志和前端可见
            AsyncNodeActionWithConfig<CodeGenWorkflowState> countedAction = (s, c) -> {
                int n = attempt.incrementAndGet();
                if (n > 1) {
                    log.warn("节点 {} 调用失败，第 {} 次重试", nodeId, n - 1);
                    CodeGenWorkflow.emitProgress(CodeGenWorkflow.getOutputSink(c), s.generationType(),
                            "%s 调用失败，正在第 %d 次重试".formatted(nodeId, n - 1));
                }
                return action.apply(s, c);
            };
            CompletableFuture<Map<String, Object>> result = retryHook.applyWrap(nodeId, state, config, countedAction);
            if (fallback == null) {
                return result;
            }
            return result.exceptionally(e -> {
                log.error("节点 {} 共尝试 {} 次仍失败，执行降级", nodeId, attempt.get(), e);
                return fallback.apply(state);
            });
        };
    }

    /**
     * 限流、服务端错误、超时、网络中断可重试；鉴权失败、参数错误、模型不存在和已开始输出不可重试
     */
    static boolean isRetryable(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t instanceof OutputStartedException || t instanceof NonRetriableException) {
                return false;
            }
            if (t instanceof RetriableException || t instanceof IOException || t instanceof TimeoutException) {
                return true;
            }
        }
        return false;
    }
}
