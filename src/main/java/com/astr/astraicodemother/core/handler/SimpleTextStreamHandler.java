package com.astr.astraicodemother.core.handler;

import com.astr.astraicodemother.core.StreamSignal;
import com.astr.astraicodemother.model.entity.User;
import com.astr.astraicodemother.model.enums.ChatHistoryMessageTypeEnum;
import com.astr.astraicodemother.service.ChatHistoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;


/**
 * 简单文本流处理器
 * 处理 HTML 和 MULTI_FILE 类型的流式响应
 */
@Slf4j
@Component
public class SimpleTextStreamHandler {

    /**
     * 处理传统流（HTML, MULTI_FILE）
     * 直接收集完整的文本响应
     *
     * @param originFlux         原始流
     * @param chatHistoryService 聊天历史服务
     * @param appId              应用ID
     * @param loginUser          登录用户
     * @return 处理后的流
     */
    public Flux<String> handle(Flux<String> originFlux,
                               ChatHistoryService chatHistoryService,
                               long appId, User loginUser) {
        StringBuilder aiResponseBuilder = new StringBuilder();
        return originFlux
                .map(chunk -> {
                    // 收集AI响应内容（控制信号不属于 AI 回复，不写入对话历史）
                    if (!StreamSignal.isSignal(chunk)) {
                        aiResponseBuilder.append(chunk);
                    }
                    return chunk;
                })
                .doOnComplete(() -> {
                    // 流式响应完成后，添加AI消息到对话历史
                    String aiResponse = aiResponseBuilder.toString();
                    saveAiMessage(chatHistoryService, appId, aiResponse, loginUser);
                })
                .doOnError(error -> {
                    // 如果AI回复失败，也要记录错误消息
                    String errorMessage = "AI回复失败: " + error.getMessage();
                    saveAiMessage(chatHistoryService, appId, errorMessage, loginUser);
                });
    }

    /**
     * 保存 AI 消息到对话历史；保存失败只记录日志，避免中断已生成完毕的流，导致前端收不到结束事件
     */
    private static void saveAiMessage(ChatHistoryService chatHistoryService, long appId, String message, User loginUser) {
        try {
            chatHistoryService.addChatMessage(appId, message, ChatHistoryMessageTypeEnum.AI.getValue(), loginUser.getId());
        } catch (Exception e) {
            log.error("保存 AI 消息到对话历史失败，appId: {}，消息长度: {}", appId, message.length(), e);
        }
    }
}
