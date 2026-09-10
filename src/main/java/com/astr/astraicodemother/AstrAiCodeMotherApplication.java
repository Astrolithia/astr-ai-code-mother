package com.astr.astraicodemother;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;


@SpringBootApplication
@MapperScan("com.astr.astraicodemother.mapper")
public class AstrAiCodeMotherApplication {

    public static void main(String[] args) {
        SpringApplication.run(AstrAiCodeMotherApplication.class, args);
    }

}
