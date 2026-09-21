package com.astr.astraicodemother.service;

import com.astr.astraicodemother.model.dto.chatHistory.ChatHistoryQueryRequest;
import com.astr.astraicodemother.model.entity.ChatHistory;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.core.service.IService;

import java.time.LocalDateTime;

/**
 * 对话历史 服务层。
 *
 * @author Astrolithia
 */
public interface ChatHistoryService extends IService<ChatHistory> {

    /**
     * 新增一条对话消息
     *
     * @param appId       应用 id
     * @param message     消息内容
     * @param messageType 消息类型（{@link com.astr.astraicodemother.model.enums.ChatHistoryMessageTypeEnum}）
     * @param userId      创建用户 id
     * @return 是否新增成功
     */
    boolean addChatMessage(Long appId, String message, String messageType, Long userId);

    /**
     * 根据应用 id 删除其全部对话历史（应用删除时级联调用）
     *
     * @param appId 应用 id
     * @return 是否删除成功
     */
    boolean deleteByAppId(Long appId);

    /**
     * 根据查询条件构造数据查询参数
     *
     * @param chatHistoryQueryRequest 对话历史查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(ChatHistoryQueryRequest chatHistoryQueryRequest);

    /**
     * 游标分页查询某个应用的对话历史（按创建时间倒序，支持向前加载更多）
     *
     * @param appId          应用 id
     * @param pageSize       每页条数
     * @param lastCreateTime 游标：只查询该时间之前的消息，为空表示查询最新的一页
     * @return 分页结果
     */
    Page<ChatHistory> listAppChatHistoryByPage(Long appId, int pageSize, LocalDateTime lastCreateTime);

}
