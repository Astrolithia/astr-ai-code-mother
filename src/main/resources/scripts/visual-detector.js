/**
 * DOM 碰撞与重叠检测器（直接在无头浏览器 page 上 evaluate 执行）
 */
function runDOMCollisionDetector() {
  const issues = [];
  
  // 1. 收集页面上所有的显著文本节点和可交互控件
  const candidates = Array.from(document.querySelectorAll(
    'button, .ant-btn, a, h1, h2, h3, h4, h5, h6, p, .ant-space, .hero-meta, .hero-actions, .ant-card'
  )).filter(el => {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  // 2. 双重遍历检测几何重叠
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];

      // 跳过祖先/后代节点之间的自然包含关系
      if (a.contains(b) || b.contains(a)) continue;

      const rA = a.getBoundingClientRect();
      const rB = b.getBoundingClientRect();

      // 计算相交矩形
      const xOverlap = Math.max(0, Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left));
      const yOverlap = Math.max(0, Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top));

      // 只要水平相交且垂直重叠超过 4px，并且不是同一个 flex 容器内的合法对齐
      if (xOverlap > 20 && yOverlap >= 4) {
        const textA = (a.innerText || a.className || a.tagName).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 30);
        const textB = (b.innerText || b.className || b.tagName).replace(/[\r\n\t]+/g, ' ').trim().slice(0, 30);
        
        // 避免重复记录相同文本片段
        if (textA !== textB) {
          issues.push({
            type: 'ELEMENT_OVERLAP',
            elementA: `<${a.tagName.toLowerCase()} class="${a.className}">: "${textA}"`,
            elementB: `<${b.tagName.toLowerCase()} class="${b.className}">: "${textB}"`,
            overlapHeight: Math.round(yOverlap),
            description: `元素 [${textA}] 与 [${textB}] 发生异常重叠遮挡 (垂直重叠 ${Math.round(yOverlap)}px)`
          });
        }
      }
    }
  }

  // 3. 视口水平溢出检测（防止横向滚动条破版）
  const bodyWidth = document.documentElement.clientWidth;
  const overflowElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const r = el.getBoundingClientRect();
    return r.right > bodyWidth + 5;
  }).map(el => `<${el.tagName.toLowerCase()} class="${el.className}">`).slice(0, 3);

  if (overflowElements.length > 0) {
    issues.push({
      type: 'VIEWPORT_OVERFLOW',
      description: `页面存在横向溢出元素，导致出现不正常的水平滚动条: ${overflowElements.join(', ')}`
    });
  }

  return issues;
}

module.exports = { runDOMCollisionDetector };
