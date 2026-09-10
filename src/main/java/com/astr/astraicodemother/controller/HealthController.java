package com.astr.astraicodemother.controller;

import com.astr.astraicodemother.common.BaseResponse;
import com.astr.astraicodemother.common.ResultUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/health")
public class HealthController {

    @GetMapping("/ok")
    public BaseResponse<String> ok() {
        return ResultUtils.success("ok");
    }
}
