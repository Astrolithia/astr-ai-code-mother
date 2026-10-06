package com.astr.astraicodemother.core.template;

import com.astr.astraicodemother.model.enums.CodeGenTypeEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CodeTemplatePromptEnhancerTest {

    private CodeTemplateProvider provider;
    private CodeTemplatePromptEnhancer enhancer;

    @BeforeEach
    void setUp() {
        // 使用模拟对象控制模板内容，不启动 Spring 或连接外部服务。
        provider = mock(CodeTemplateProvider.class);
        enhancer = new CodeTemplatePromptEnhancer(provider);
    }

    @Test
    @DisplayName("有模板时组合模板、使用规则与原始需求")
    void includesTemplateRulesAndOriginalMessage() {
        String template = "测试模板\n```html\n<h1>基础页面</h1>\n```";
        String message = "  创建一个读书笔记网站\n保留我的配色  ";
        when(provider.getTemplate(CodeGenTypeEnum.MULTI_FILE)).thenReturn(template);

        String result = enhancer.enhance(message, CodeGenTypeEnum.MULTI_FILE);

        assertAll(
                () -> assertTrue(result.contains("【代码模板参考】")),
                () -> assertTrue(result.contains(template)),
                () -> assertTrue(result.contains("【模板使用规则】")),
                () -> assertTrue(result.contains("不得重置为默认模板")),
                () -> assertTrue(result.contains("【用户需求】")),
                () -> assertTrue(result.endsWith(message + "\n"), "不能裁剪或修改用户原始需求")
        );
        verify(provider).getTemplate(CodeGenTypeEnum.MULTI_FILE);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "\n"})
    @DisplayName("模板为 null、空串或空白时原样返回需求")
    void returnsOriginalMessageWhenTemplateIsAbsent(String template) {
        String message = "  创建一个读书笔记网站  ";
        when(provider.getTemplate(CodeGenTypeEnum.MULTI_FILE)).thenReturn(template);

        String result = enhancer.enhance(message, CodeGenTypeEnum.MULTI_FILE);

        assertEquals(message, result);
        verify(provider).getTemplate(CodeGenTypeEnum.MULTI_FILE);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\t", "\n"})
    @DisplayName("用户输入为 null、空串或空白时不读取模板")
    void returnsInvalidMessageWithoutReadingTemplate(String message) {
        String result = enhancer.enhance(message, CodeGenTypeEnum.MULTI_FILE);

        assertEquals(message, result);
        verifyNoInteractions(provider);
    }

    @ParameterizedTest
    @EnumSource(value = CodeGenTypeEnum.class, names = {"HTML", "VUE_PROJECT"})
    @DisplayName("没有配置模板的生成类型保持原始需求")
    void returnsOriginalMessageForTypesWithoutTemplates(CodeGenTypeEnum codeGenType) {
        String message = "创建一个作品集网站";
        when(provider.getTemplate(codeGenType)).thenReturn("");

        String result = enhancer.enhance(message, codeGenType);

        assertEquals(message, result);
        verify(provider).getTemplate(codeGenType);
    }

    @Test
    @DisplayName("生成类型为 null 且无模板时保持原始需求")
    void returnsOriginalMessageForNullType() {
        String message = "创建一个作品集网站";
        when(provider.getTemplate(null)).thenReturn("");

        assertEquals(message, enhancer.enhance(message, null));
        verify(provider).getTemplate(null);
    }

    @Test
    @DisplayName("模板与需求中的百分号和格式符保持不变")
    void preservesPercentSignsAndFormatPlaceholders() {
        String template = "CSS：width: 100%; 占位文本：%s";
        String message = "展示 20% 折扣，并保留字面量 %s 和 %n";
        when(provider.getTemplate(CodeGenTypeEnum.MULTI_FILE)).thenReturn(template);

        String result = enhancer.enhance(message, CodeGenTypeEnum.MULTI_FILE);

        assertAll(
                () -> assertTrue(result.contains(template)),
                () -> assertTrue(result.endsWith(message + "\n"))
        );
    }

    @Test
    @DisplayName("真实模板可从 classpath 加载并用于增强")
    void loadsRealTemplateAndEnhancesMessage() {
        CodeTemplateProvider realProvider = new CodeTemplateProvider();
        // 手动创建的对象不会自动执行 @PostConstruct。
        realProvider.init();
        String template = realProvider.getTemplate(CodeGenTypeEnum.MULTI_FILE);

        assertFalse(template.isBlank(), "basic-v1.txt 应能从测试 classpath 读取");
        assertAll(
                () -> assertTrue(template.contains("```html\n")),
                () -> assertTrue(template.contains("```css\n")),
                () -> assertTrue(template.contains("```javascript\n")),
                () -> assertEquals("", realProvider.getTemplate(CodeGenTypeEnum.HTML)),
                () -> assertEquals("", realProvider.getTemplate(CodeGenTypeEnum.VUE_PROJECT)),
                () -> assertEquals("", realProvider.getTemplate(null))
        );

        CodeTemplatePromptEnhancer realEnhancer = new CodeTemplatePromptEnhancer(realProvider);
        String message = "创建一个读书笔记网站，支持按标签筛选";
        String result = realEnhancer.enhance(message, CodeGenTypeEnum.MULTI_FILE);

        assertAll(
                () -> assertTrue(result.contains(template)),
                () -> assertTrue(result.endsWith(message + "\n"))
        );
    }
}
