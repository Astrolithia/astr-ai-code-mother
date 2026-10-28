package com.astr.astraicodemother.langgraph4j.hook;

import com.astr.astraicodemother.langgraph4j.state.CodeGenWorkflowState;
import dev.langchain4j.exception.AuthenticationException;
import dev.langchain4j.exception.RateLimitException;
import org.bsc.langgraph4j.CompiledGraph;
import org.bsc.langgraph4j.StateGraph;
import org.bsc.langgraph4j.hook.NodeHook;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.bsc.langgraph4j.StateGraph.END;
import static org.bsc.langgraph4j.StateGraph.START;
import static org.bsc.langgraph4j.action.AsyncNodeAction.node_async;

/**
 * 用假节点验证重试钩子挂到图上后的行为，不调用真实 AI
 */
class NodeRetryHookTest {

    private static final String NODE = "flaky";

    private static final Map<String, Object> FALLBACK = Map.of(CodeGenWorkflowState.ENHANCED_PROMPT, "fallback");

    @Test
    void retryUntilSuccess() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        CompiledGraph<CodeGenWorkflowState> graph = buildGraph(calls, 2, new RateLimitException("429"),
                NodeRetryHook.withFallback(state -> FALLBACK));
        Assertions.assertEquals("ok", graph.invoke(Map.of()).orElseThrow().enhancedPrompt());
        Assertions.assertEquals(3, calls.get());
    }

    @Test
    void nonRetriableGoesToFallback() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        CompiledGraph<CodeGenWorkflowState> graph = buildGraph(calls, Integer.MAX_VALUE, new AuthenticationException("401"),
                NodeRetryHook.withFallback(state -> FALLBACK));
        Assertions.assertEquals("fallback", graph.invoke(Map.of()).orElseThrow().enhancedPrompt());
        Assertions.assertEquals(1, calls.get());
    }

    @Test
    void outputStartedIsNotRetried() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        CompiledGraph<CodeGenWorkflowState> graph = buildGraph(calls, Integer.MAX_VALUE,
                new OutputStartedException("已输出部分内容", new RateLimitException("429")), NodeRetryHook.retry());
        Assertions.assertThrows(Exception.class, () -> graph.invoke(Map.of()));
        Assertions.assertEquals(1, calls.get());
    }

    @Test
    void exhaustedGoesToFallback() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        CompiledGraph<CodeGenWorkflowState> graph = buildGraph(calls, Integer.MAX_VALUE, new RateLimitException("429"),
                NodeRetryHook.withFallback(state -> FALLBACK));
        Assertions.assertEquals("fallback", graph.invoke(Map.of()).orElseThrow().enhancedPrompt());
        Assertions.assertEquals(3, calls.get());
    }

    @Test
    void retryableCauseIsRecognized() {
        Assertions.assertTrue(NodeRetryHook.isRetryable(new RuntimeException(new IOException("connection reset"))));
        Assertions.assertFalse(NodeRetryHook.isRetryable(new IllegalStateException("JSON 解析失败")));
    }

    /**
     * 构建只有一个节点的图：前 failTimes 次抛出 error，之后返回 ok
     */
    private static CompiledGraph<CodeGenWorkflowState> buildGraph(AtomicInteger calls, int failTimes, RuntimeException error,
                                                                 NodeHook.WrapCall<CodeGenWorkflowState> hook) throws Exception {
        return new StateGraph<>(CodeGenWorkflowState.SCHEMA, CodeGenWorkflowState::new)
                .addNode(NODE, node_async(state -> {
                    if (calls.incrementAndGet() <= failTimes) {
                        throw error;
                    }
                    return Map.of(CodeGenWorkflowState.ENHANCED_PROMPT, "ok");
                }))
                .addEdge(START, NODE)
                .addEdge(NODE, END)
                .addWrapCallNodeHook(NODE, hook)
                .compile();
    }
}
