package com.astr.astraicodemother.ai;

import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("local")
class AiCodeGenTypeRoutingServiceTest {

    @Resource
    private AiCodeGenTypeRoutingService aiCodeGenTypeRoutingService;

    @Test
    void routeCodeGenType() {
        Assertions.assertEquals(CodeGenTypeEnum.HTML,
                aiCodeGenTypeRoutingService.routeCodeGenType("做一个简单的个人介绍页面"));
        Assertions.assertEquals(CodeGenTypeEnum.VUE_PROJECT,
                aiCodeGenTypeRoutingService.routeCodeGenType("做一个电商管理后台，包含商品管理、订单管理、用户权限、数据统计图表"));
    }
}
