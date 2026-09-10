package com.astr.astraicodemother.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StringUtilsTest {

    @Test
    void isBlankReturnsTrueForNull() {
        assertTrue(StringUtils.isBlank(null));
    }

    @Test
    void isBlankReturnsTrueForEmptyString() {
        assertTrue(StringUtils.isBlank(""));
    }

    @Test
    void isBlankReturnsTrueForWhitespaceOnly() {
        assertTrue(StringUtils.isBlank("   \t\n"));
    }

    @Test
    void isBlankReturnsFalseForNonBlankString() {
        assertFalse(StringUtils.isBlank("abc"));
    }

    @Test
    void isBlankReturnsFalseForStringWithSurroundingWhitespace() {
        assertFalse(StringUtils.isBlank("  abc  "));
    }
}
