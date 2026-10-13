package com.astr.astraicodemother.core;

import com.astr.astraicodemother.ai.model.HtmlCodeResult;
import com.astr.astraicodemother.ai.model.MultiFileCodeResult;
import com.astr.astraicodemother.core.parser.HtmlCodeParser;
import com.astr.astraicodemother.core.parser.MultiFileCodeParser;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CodeParserTest {

    @Test
    void parseHtmlCode() {
        String codeContent = """
                随便写一段描述：
                ```html
                <!DOCTYPE html>
                <html>
                <head>
                    <title>测试页面</title>
                </head>
                <body>
                    <h1>Hello World!</h1>
                </body>
                </html>
                ```
                随便写一段描述
                """;
        HtmlCodeResult result = CodeParser.parseHtmlCode(codeContent);
        assertNotNull(result);
        assertNotNull(result.getHtmlCode());
    }

    @Test
    void parseMultiFileCode() {
        String codeContent = """
                创建一个完整的网页：
                ```html
                <!DOCTYPE html>
                <html>
                <head>
                    <title>多文件示例</title>
                    <link rel="stylesheet" href="style.css">
                </head>
                <body>
                    <h1>欢迎使用</h1>
                    <script src="script.js"></script>
                </body>
                </html>
                ```
                ```css
                h1 {
                    color: blue;
                    text-align: center;
                }
                ```
                ```js
                console.log('页面加载完成');
                ```
                文件创建完成！
                """;
        MultiFileCodeResult result = CodeParser.parseMultiFileCode(codeContent);
        assertNotNull(result);
        assertNotNull(result.getHtmlCode());
        assertNotNull(result.getCssCode());
        assertNotNull(result.getJsCode());
    }

    @Test
    void multiFileCodeCompleteOnlyWhenAllBlocksClosed() {
        MultiFileCodeParser parser = new MultiFileCodeParser();
        String htmlAndCss = "```html\n<p>a</p>\n```\n```css\np{}\n```\n";
        assertFalse(parser.isCodeComplete(htmlAndCss));
        assertFalse(parser.isCodeComplete(htmlAndCss + "```javascript\nconsole.log(1)"));
        assertTrue(parser.isCodeComplete(htmlAndCss + "```javascript\nconsole.log(1)\n```"));
    }

    @Test
    void htmlCodeCompleteOnlyWhenBlockClosed() {
        HtmlCodeParser parser = new HtmlCodeParser();
        assertFalse(parser.isCodeComplete("```html\n<p>a</p>\n``"));
        assertTrue(parser.isCodeComplete("```html\n<p>a</p>\n```"));
    }
}
