package com.astr.astraicodemother.controller;

import com.astr.astraicodemother.annotation.AuthCheck;
import com.astr.astraicodemother.common.BaseResponse;
import com.astr.astraicodemother.common.ResultUtils;
import com.astr.astraicodemother.constant.UserConstant;
import com.astr.astraicodemother.exception.ErrorCode;
import com.astr.astraicodemother.exception.ThrowUtils;
import com.astr.astraicodemother.model.dto.chatHistory.ChatHistoryQueryRequest;
import com.astr.astraicodemother.model.entity.App;
import com.astr.astraicodemother.model.entity.ChatHistory;
import com.astr.astraicodemother.model.entity.User;
import com.astr.astraicodemother.service.AppService;
import com.astr.astraicodemother.service.ChatHistoryService;
import com.astr.astraicodemother.service.UserService;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/**
 * 对话历史 控制层。
 *
 * @author Astrolithia
 */
@RestController
@RequestMapping("/chatHistory")
public class ChatHistoryController {

    @Resource
    private ChatHistoryService chatHistoryService;

    @Resource
    private AppService appService;

    @Resource
    private UserService userService;

    /**
     * 游标分页查询某个应用的对话历史（仅应用创建者和管理员可见）
     * <p>
     * 每次加载最新 pageSize 条消息，传入上一批最早一条消息的创建时间作为 lastCreateTime 可向前加载更多历史记录。
     *
     * @param appId          应用 id
     * @param pageSize       每页条数，默认 10
     * @param lastCreateTime 游标：只查询该时间之前的消息，为空表示查询最新的一页
     * @param request        请求对象
     * @return 对话历史分页
     */
    @GetMapping("/app/{appId}/page")
    public BaseResponse<Page<ChatHistory>> listAppChatHistoryByPage(
            @PathVariable Long appId,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime lastCreateTime,
            HttpServletRequest request) {
        ThrowUtils.throwIf(appId == null || appId <= 0, ErrorCode.PARAMS_ERROR, "应用 ID 错误");
        User loginUser = userService.getLoginUser(request);
        App app = appService.getById(appId);
        ThrowUtils.throwIf(app == null, ErrorCode.NOT_FOUND_ERROR, "应用不存在");
        // 仅应用创建者和管理员可见
        boolean isAdmin = UserConstant.ADMIN_ROLE.equals(loginUser.getUserRole());
        ThrowUtils.throwIf(!app.getUserId().equals(loginUser.getId()) && !isAdmin, ErrorCode.NO_AUTH_ERROR);
        Page<ChatHistory> chatHistoryPage = chatHistoryService.listAppChatHistoryByPage(appId, pageSize, lastCreateTime);
        return ResultUtils.success(chatHistoryPage);
    }

    /**
     * 分页查询所有应用的对话历史（仅管理员，按时间降序，便于内容监管）
     *
     * @param chatHistoryQueryRequest 对话历史查询请求
     * @return 对话历史分页
     */
    @PostMapping("/admin/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    public BaseResponse<Page<ChatHistory>> listChatHistoryByPageByAdmin(@RequestBody ChatHistoryQueryRequest chatHistoryQueryRequest) {
        ThrowUtils.throwIf(chatHistoryQueryRequest == null, ErrorCode.PARAMS_ERROR);
        long pageNum = chatHistoryQueryRequest.getPageNum();
        long pageSize = chatHistoryQueryRequest.getPageSize();
        QueryWrapper queryWrapper = chatHistoryService.getQueryWrapper(chatHistoryQueryRequest);
        Page<ChatHistory> chatHistoryPage = chatHistoryService.page(Page.of(pageNum, pageSize), queryWrapper);
        return ResultUtils.success(chatHistoryPage);
    }

}
