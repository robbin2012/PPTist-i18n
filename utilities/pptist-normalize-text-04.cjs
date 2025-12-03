#!/usr/bin/env node

/**
 * One-off normalizer for utilities/test/pptist-04.json
 *
 * 只做一件事：
 *   - 把文本里多层 / 多个相同样式的 <span style="..."> 合并成一个 wrapper span；
 *   - wrapper 的 style 来自原来的 span 样式合并（字体 / 颜色 / 大小等都沿用原值）；
 *   - 不强制改字体、不统一颜色或字号。
 *
 * 处理范围：
 *   - text 元素：textType in ["item", "itemTitle", "title"]
 *   - shape.text：type in ["itemTitle", "title"]
 */

const fs = require('fs');

const INPUT_PATH = 'utilities/test/pptist-04.json';

function splitDeclarations(styleStr) {
  const res = [];
  let buf = '';
  let inEntity = false;

  for (let i = 0; i < styleStr.length; i++) {
    const ch = styleStr[i];

    if (inEntity) {
      buf += ch;
      if (ch === ';') {
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
      merged[prop] = val;
    }
  }
  const parts = [];
  for (const key of Object.keys(merged)) {
    parts.push(`${key}: ${merged[key]}`);
  }
  return parts.join(';');
}

function normalizeHtml(html) {
  if (typeof html !== 'string') return html;

  const spanMatches = [...html.matchAll(/<span style="([^"]*)">/g)];
  if (spanMatches.length <= 1) return html; // 已经是 0 或 1 个 span，不需要合并

  const styleStrings = spanMatches.map(m => m[1]);
  const combinedStyle = mergeStyles(styleStrings);
  if (!combinedStyle) return html;

  return html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/, (match, pAttrs, inner) => {
    const innerStripped = inner
      .replace(/<span style="[^"]*">/g, '')
      .replace(/<\/span>/g, '');
    return `<p${pAttrs}><span style="${combinedStyle}">${innerStripped}</span></p>`;
  });
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input JSON not found: ${INPUT_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_PATH, 'utf8');
  const data = JSON.parse(raw);

  let changed = 0;

  (data.slides || []).forEach(slide => {
    (slide.elements || []).forEach(el => {
      // text elements: item / itemTitle / title
      if (
        el.type === 'text' &&
        typeof el.content === 'string' &&
        (el.textType === 'item' ||
          el.textType === 'itemTitle' ||
          el.textType === 'title')
      ) {
        const before = el.content;
        const after = normalizeHtml(before);
        if (after !== before) {
          el.content = after;
          changed++;
        }
      }

      // shape.text: itemTitle / title
      if (
        el.type === 'shape' &&
        el.text &&
        typeof el.text.content === 'string' &&
        (el.text.type === 'itemTitle' || el.text.type === 'title')
      ) {
        const before = el.text.content;
        const after = normalizeHtml(before);
        if (after !== before) {
          el.text.content = after;
          changed++;
        }
      }
    });
  });

  fs.writeFileSync(INPUT_PATH, JSON.stringify(data, null, 2), 'utf8');

  console.log('pptist-04.json normalized.');
  console.log('  elements changed:', changed);
}

if (require.main === module) {
  main();
}

module.exports = {
  splitDeclarations,
  mergeStyles,
  normalizeHtml,
};

