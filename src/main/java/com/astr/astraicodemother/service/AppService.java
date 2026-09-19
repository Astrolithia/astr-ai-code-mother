package com.astr.astraicodemother.service;

import com.astr.astraicodemother.model.dto.app.AppAddRequest;
import com.astr.astraicodemother.model.dto.app.AppQueryRequest;
import com.astr.astraicodemother.model.entity.App;
import com.astr.astraicodemother.model.entity.User;
import com.astr.astraicodemother.model.vo.AppVO;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.core.service.IService;

import java.util.List;

/**
 * 应用 服务层。
 *
 * @author Astrolithia
 */
public interface AppService extends IService<App> {

    /**
     * 创建应用
     *
     * @param appAddRequest 应用创建请求
     * @param loginUser     当前登录用户
     * @return 新应用 id
     */
    long addApp(AppAddRequest appAddRequest, User loginUser);

    /**
     * 根据查询条件构造数据查询参数
     *
     * @param appQueryRequest 应用查询请求
     * @return
     */
    QueryWrapper getQueryWrapper(AppQueryRequest appQueryRequest);

    /**
     * 获取应用封装类
     *
     * @param app 应用信息
     * @return 应用封装类
     */
    AppVO getAppVO(App app);

    /**
     * 获取应用封装类（分页）
     *
     * @param appList 应用列表
     * @return 应用封装类列表
     */
    List<AppVO> getAppVOList(List<App> appList);
}
