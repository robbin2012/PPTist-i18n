#!/usr/bin/env node

/**
 * PPTist JSON Text Normalizer
 *
 * 这个小工具用来统一 PPTist 导出的 JSON 里的：
 *   - 列表项（textType: "item"）的 HTML 结构和样式
 *   - 列表标题（textType: "itemTitle"）的 HTML 结构
 *   - 标题（textType/type: "title"）的 HTML 结构
 *   - 将 shape.text.type === "itemTitle" / "title" 的文字提升为独立的 text 元素
 *
 * 做的事情：
 *   1. 对 list item：
 *      - 如果一句话被拆成多个相同样式的 <span style="...">，合并成一个 span；
 *      - 如果是多层嵌套 span（font-size / font-family / color 分开包裹），合并成一个 span；
 *      - 只统一主体文字的字体为：
 *          font-family: Roboto Light;
 *        不再强制修改字号和颜色，避免偏离原始设计；
 *   2. 对 itemTitle / title（包括 text 元素和 shape.text）：
 *      - 如果有多层嵌套 span 或多个相同样式 span，同样合并成一个 span；
 *      - 不改字体、字号和颜色，只做结构规范化。
 *   3. 为信息图模板做结构规范化（方便 Drupal / AI 使用）：
 *      - 将 shape.text.type === "itemTitle" / "title" 的元素转换为独立的 text 元素：
 *        - 新增 id 形如 "<shapeId>_itemTitle" 或 "<shapeId>_title"
 *        - 复制原 shape 的 left / top / width / height / rotate
 *        - 设置 textType: "itemTitle" 或 "title"
 *        - 从原 shape 中移除 text 字段，避免重复渲染
 *
 * 使用方式：
 *   node utilities/pptist-normalize-text.cjs <input.json> [output.json]
 *
 *   - 如果只传入 input.json，则会原地覆盖这个文件；
 *   - 如果同时传入 output.json，则会把处理后的结果写到新的文件。
 */

const fs = require('fs');
const path = require('path');

/**
 * 安全地按分号拆分 style 声明，避免把 &quot; 这类 HTML 实体里的分号拆开
 * @param {string} styleStr
 * @returns {string[]}
 */
function splitDeclarations(styleStr) {
  const res = [];
  let buf = '';
  let inEntity = false;

  for (let i = 0; i < styleStr.length; i++) {
    const ch = styleStr[i];

    if (inEntity) {
      buf += ch;
      if (ch === ';') {
        // 实体以分号结尾，例如 &quot;
        inEntity = false;
      }
      continue;
    }

    if (ch === '&') {
      inEntity = true;
      buf += ch;
      continue;
    }

    if (ch === ';') {
      if (buf.trim()) res.push(buf.trim());
      buf = '';
      continue;
    }

    buf += ch;
  }

  if (buf.trim()) res.push(buf.trim());
  return res;
}

/**
 * 把多个 style="" 字符串合并成一个，后面的声明覆盖前面的
 * @param {string[]} styleStrings
 * @returns {string}
 */
function mergeStyles(styleStrings) {
  const merged = {};

  for (const s of styleStrings) {
    const decls = splitDeclarations(s);
    for (const d of decls) {
      const idx = d.indexOf(':');
      if (idx === -1) continue;
      const prop = d.slice(0, idx).trim();
      const val = d.slice(idx + 1).trim();
      if (!prop || !val) continue;
      merged[prop] = val; // 后面的覆盖前面的
    }
  }

  const parts = [];
  for (const key of Object.keys(merged)) {
    parts.push(`${key}: ${merged[key]}`);
  }
  return parts.join(';');
}

/**
 * 统一一个 HTML 片段里的 span 结构：
 *   - 如果有多个 <span style="...">，合并成一个 style，包在整个 <p> 内部
 *   - 保留 <strong> / <sub> 等非 span 标签
 * @param {string} html
 * @returns {string}
 */
function normalizeSpanStructure(html) {
  if (typeof html !== 'string') return html;

  const spanMatches = [...html.matchAll(/<span style="([^"]*)">/g)];
  if (spanMatches.length <= 1) {
    // 0 或 1 个 span，本身结构已经够简单了
    return html;
  }

  const styleStrings = spanMatches.map(m => m[1]);
  const combinedStyle = mergeStyles(styleStrings);
  if (!combinedStyle) return html;

  const newHtml = html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/, (match, pAttrs, inner) => {
    const innerStripped = inner
      .replace(/<span style="[^"]*">/g, '')
      .replace(/<\/span>/g, '');
    return `<p${pAttrs}><span style="${combinedStyle}">${innerStripped}</span></p>`;
  });

  return newHtml;
}

/**
 * 把一个 style 属性字符串解析成对象
 * @param {string} styleStr
 * @returns {Record<string,string>}
 */
function parseStyle(styleStr) {
  const obj = {};
  const decls = splitDeclarations(styleStr);
  for (const d of decls) {
    const idx = d.indexOf(':');
    if (idx === -1) continue;
    const prop = d.slice(0, idx).trim();
    const val = d.slice(idx + 1).trim();
    if (!prop || !val) continue;
    obj[prop] = val;
  }
  return obj;
}

/**
 * 把 style 对象重新拼成 style="" 字符串
 * @param {Record<string,string>} styleObj
 * @returns {string}
 */
function stringifyStyle(styleObj) {
  const parts = [];
  for (const key of Object.keys(styleObj)) {
    parts.push(`${key}: ${styleObj[key]}`);
  }
  return parts.join(';');
}

/**
 * 规范化 list item（textType: "item"）：
 *   - 先把多 span 结构合并成一个 span
 *   - 再只统一 font-family，字号 / 颜色保持原始值
 * @param {string} html
 * @returns {string}
 */
function normalizeListItemHTML(html) {
  if (typeof html !== 'string') return html;

  // 先规范化 span 结构
  let result = normalizeSpanStructure(html);

  // 再统一样式：只改 span 上的 font-family，不动 <p style="text-align: ...">，
  // 字号和颜色沿用原始值
  result = result.replace(/<span style="([^"]*)">/g, (match, styleStr) => {
    const styleObj = parseStyle(styleStr);

    // 统一列表项的字体，避免后续导入时字体被重置
    styleObj['font-family'] = 'Roboto Light';

    const newStyle = stringifyStyle(styleObj);
    return `<span style="${newStyle}">`;
  });

  return result;
}

/**
 * 规范化 itemTitle（textType: "itemTitle"）：
 *   - 只合并多层 / 多个 span 为一个 span，不改样式值
 * @param {string} html
 * @returns {string}
 */
function normalizeItemTitleHTML(html) {
  return normalizeSpanStructure(html);
}

/**
 * 对整份 PPTist JSON 做规范化处理
 * @param {Object} data
 * @returns {{data:Object, stats:Object}}
 */
function normalizePptistJson(data) {
  const stats = {
    listItemsTouched: 0,
    itemTitlesTouched: 0,
    titlesTouched: 0,
    itemTitleShapesLifting: 0,
    titleShapesLifting: 0,
  };

  if (!data || !Array.isArray(data.slides)) {
    return { data, stats };
  }

  data.slides.forEach(slide => {
    const elements = Array.isArray(slide.elements) ? slide.elements : [];
    const newElements = [];

    elements.forEach(el => {
      // 总是保留原始元素（可能会移除其 text 字段）
      newElements.push(el);

      // 列表项正文：textType === "item"
      if (el.type === 'text' && el.textType === 'item' && typeof el.content === 'string') {
        const updated = normalizeListItemHTML(el.content);
        if (updated !== el.content) {
          el.content = updated;
          stats.listItemsTouched++;
        }
      }

      // 列表项标题：textType === "itemTitle"
      if (el.type === 'text' && el.textType === 'itemTitle' && typeof el.content === 'string') {
        const updated = normalizeItemTitleHTML(el.content);
        if (updated !== el.content) {
          el.content = updated;
          stats.itemTitlesTouched++;
        }
      }

      // 标题：textType === "title"
      if (el.type === 'text' && el.textType === 'title' && typeof el.content === 'string') {
        const updated = normalizeItemTitleHTML(el.content);
        if (updated !== el.content) {
          el.content = updated;
          stats.titlesTouched++;
        }
      }

      // shape 内的 itemTitle / title：
      //   1) 先规范化 HTML
      //   2) 再将其“提升”为一个独立的 text 元素，方便后续按 textType 映射
      if (
        el.type === 'shape' &&
        el.text &&
        (el.text.type === 'itemTitle' || el.text.type === 'title') &&
        typeof el.text.content === 'string'
      ) {
        const normalizedHtml = normalizeItemTitleHTML(el.text.content);
        if (normalizedHtml !== el.text.content) {
          el.text.content = normalizedHtml;
          if (el.text.type === 'itemTitle') {
            stats.itemTitlesTouched++;
          } else if (el.text.type === 'title') {
            stats.titlesTouched++;
          }
        }

        const isTitle = el.text.type === 'title';
        const textId = (el.id || 'shape') + (isTitle ? '_title' : '_itemTitle');
        const liftedTextEl = {
          type: 'text',
          id: textId,
          left: el.left ?? 0,
          top: el.top ?? 0,
          width: el.width ?? 100,
          height: el.height ?? 30,
          rotate: el.rotate ?? 0,
          defaultFontName: '',
          defaultColor: '#333',
          content: el.text.content || '',
          lineHeight: 1,
          outline: { color: '#000000', width: 0, style: 'solid' },
          fill: '',
          vertical: false,
          textType: isTitle ? 'title' : 'itemTitle',
        };

        newElements.push(liftedTextEl);
        delete el.text; // shape 只保留几何 / 填充信息，文字交给独立 text 元素
        if (isTitle) {
          stats.titleShapesLifting++;
        } else {
          stats.itemTitleShapesLifting++;
        }
      }
    });

    slide.elements = newElements;
  });

  return { data, stats };
}

function printUsage() {
  console.error('Usage: node utilities/pptist-normalize-text.cjs <input.json> [output.json]');
  console.error('');
  console.error('Examples:');
  console.error('  # 原地覆盖');
  console.error('  node utilities/pptist-normalize-text.cjs utilities/test/pptist-03.json');
  console.error('');
  console.error('  # 输出到新的 JSON 文件');
  console.error('  node utilities/pptist-normalize-text.cjs input.json output/normalized.json');
  console.error('');
  console.error('说明：');
  console.error('  - 会规范化 list item / itemTitle 的 HTML 结构；');
  console.error('  - 会把 shape.text.type === \"itemTitle\" 的标题提升为独立的 text 元素，');
  console.error('    新增 id 形如 \"<shapeId>_title\"，并设置 textType: \"itemTitle\"，方便后续 AI / Drupal 按 textType 映射。');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath;

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(inputPath, 'utf8');
    const json = JSON.parse(raw);

    const { data: normalized, stats } = normalizePptistJson(json);

    // 输出时格式化一下，方便 diff
    fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2), 'utf8');

    console.log('PPTist JSON normalized successfully.');
    console.log(`  Input : ${inputPath}`);
    console.log(`  Output: ${outputPath}`);
    console.log(`  List items updated      : ${stats.listItemsTouched}`);
    console.log(`  Item titles updated     : ${stats.itemTitlesTouched}`);
    console.log(`  ItemTitle lifted (shape): ${stats.itemTitleShapesLifting}`);
  } catch (err) {
    console.error('Error processing file:', err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  splitDeclarations,
  mergeStyles,
  normalizeSpanStructure,
  normalizeListItemHTML,
  normalizeItemTitleHTML,
  normalizePptistJson,
};
