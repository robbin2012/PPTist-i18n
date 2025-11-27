#!/usr/bin/env node

/**
 * Generate template intros for CSV rows
 *
 * 根据 CSV 中的标题（Title）+ 备注（Notes）+ 分类（Category）+ 标签（Tags）等信息，
 * 自动生成约 150 字的中文简介，写入到 Body 列中。
 *
 * 用法：
 *   node utilities/pptist-generate-intro.cjs <input.csv> [output.csv]
 *
 * - 未指定 output.csv 时，会直接覆盖原文件；
 * - 会尝试识别以下列名（不区分大小写）：
 *   Title, Body, Category, Notes, Tags, Thumbnail
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse a single CSV line handling quoted fields
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Parse CSV content into header + rows
 * @param {string} content
 * @returns {{ header: string[], rows: string[][] }}
 */
function parseCSV(content) {
  const lines = content
    .split('\n')
    // 保留可能的空字段行，但去掉完全空白的尾部行
    .filter((line, index, arr) => line.trim() || index < arr.length - 1);

  if (lines.length === 0) {
    throw new Error('CSV 文件为空');
  }

  const header = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);

  return { header, rows };
}

/**
 * Escape CSV field when stringifying
 * @param {string} value
 * @returns {string}
 */
function escapeCSVField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);

  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Stringify CSV data from header + rows
 * @param {string[]} header
 * @param {string[][]} rows
 * @returns {string}
 */
function stringifyCSV(header, rows) {
  const allRows = [header, ...rows];
  return allRows
    .map(cols => cols.map(escapeCSVField).join(','))
    .join('\n');
}

function toLowerTrim(str) {
  return (str || '').toString().trim().toLowerCase();
}

/**
 * Map slide category (English) to Chinese description
 * @param {string} category
 * @returns {string}
 */
function mapCategoryToZh(category) {
  const key = toLowerTrim(category);
  switch (key) {
    case 'cover':
      return '封面页';
    case 'table of contents':
    case 'contents':
      return '目录页';
    case 'transition':
      return '过渡页';
    case 'end':
      return '结束页';
    case 'chart':
      return '图表页';
    case 'table':
      return '表格页';
    case 'image with title':
      return '图片+标题页';
    case 'diagram':
      return '图示说明页';
    case 'title and content':
      return '标题+内容页';
    case 'blank':
      return '空白页';
    default:
      return category ? `${category} 模板` : '内容页模板';
  }
}

/**
 * Extract "适用场景" part from notes
 * @param {string} notes
 * @returns {string}
 */
function extractUsageFromNotes(notes) {
  if (!notes) return '';
  const m = notes.match(/适用场景\s*[：:]\s*([^；。]+)/);
  if (m && m[1]) {
    return m[1].trim();
  }
  return '';
}

/**
 * Extract color info from notes
 * @param {string} notes
 * @returns {string}
 */
function extractColorsFromNotes(notes) {
  if (!notes) return '';
  const m = notes.match(/颜色\s*[：:]\s*([^；。]+)/);
  if (m && m[1]) {
    return m[1].trim();
  }
  return '';
}

/**
 * Describe style based on tags / colors
 * @param {string} tags
 * @param {string} colors
 * @returns {string}
 */
function buildStylePhrase(tags, colors) {
  const src = `${tags || ''} ${colors || ''}`;
  if (!src.trim()) return '整体风格简洁现代';

  if (/深/ .test(src) || /暗/ .test(src)) {
    return '整体风格沉稳大气';
  }
  if (/浅/ .test(src) || /清/ .test(src)) {
    return '整体风格清新明快';
  }
  if (/绿/ .test(src) && /橙|黄/.test(src)) {
    return '色彩活泼，又兼具专业感';
  }
  if (/蓝/.test(src)) {
    return '整体风格专业可靠';
  }
  if (/灰|白/.test(src)) {
    return '整体风格简洁商务';
  }

  return '整体配色协调，视觉效果舒适';
}

/**
 * Smartly truncate Chinese text to target length
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function smartTruncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;

  const hard = Math.max(0, maxLength);
  // Try to cut at Chinese punctuation before maxLength
  const punctuation = ['。', '！', '？', '；', '，'];
  let cutIndex = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (i <= hard && punctuation.includes(text[i])) {
      cutIndex = i + 1;
      break;
    }
  }

  if (cutIndex === -1 || cutIndex < hard * 0.6) {
    // Fallback: hard cut and add ellipsis
    return text.slice(0, hard) + '…';
  }

  return text.slice(0, cutIndex);
}

/**
 * Generate intro (~150 chars) for a CSV row
 * @param {Object} ctx
 * @param {string} ctx.title
 * @param {string} ctx.category
 * @param {string} ctx.notes
 * @param {string} ctx.tags
 * @param {boolean} ctx.hasThumbnail
 * @returns {string}
 */
function generateIntro({ title, category, notes, tags, hasThumbnail }) {
  const cleanTitle = (title || '').trim();
  const usage = extractUsageFromNotes(notes);
  const colors = extractColorsFromNotes(notes);
  const stylePhrase = buildStylePhrase(tags, colors);
  const categoryZh = mapCategoryToZh(category);

  const titlePart = cleanTitle ? `《${cleanTitle}》` : '本模板';

  const usagePart = usage
    ? `适用于${usage.replace(/[；。]+$/g, '')}`
    : '适用于通用商务汇报、项目规划、课程展示等多种场景';

  const colorPart = colors
    ? `采用${colors.replace(/[；。]+$/g, '')}等配色，`
    : '';

  const coverPart = hasThumbnail
    ? '封面设计简洁大方，图文布局突出核心信息，方便快速替换为你的实际内容。'
    : '版式结构清晰，层级分明，便于根据不同主题快速复用和扩展。';

  let intro =
    `${titlePart}是一页${categoryZh}，${usagePart}。` +
    `${colorPart}${stylePhrase}，兼顾观感与可读性。` +
    coverPart;

  // 目标约 150 字，设置上限 170，超出则智能截断
  intro = smartTruncate(intro, 170);

  return intro;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('用法：');
    console.error('  node utilities/pptist-generate-intro.cjs <input.csv> [output.csv]');
    console.error('');
    console.error('说明：');
    console.error('  - 会根据 Title / Notes / Category / Tags 自动生成中文简介，写回 Body 列；');
    console.error('  - 未指定 output.csv 时，直接覆盖 input.csv。');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath;

  if (!fs.existsSync(inputPath)) {
    console.error(`未找到输入文件：${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const { header, rows } = parseCSV(raw);

  if (!header || header.length === 0) {
    console.error('CSV 头部为空，无法解析列名');
    process.exit(1);
  }

  const headerLower = header.map(toLowerTrim);

  const idxTitle = headerLower.indexOf('title');
  const idxDesc = headerLower.indexOf('body');
  const idxCategory = headerLower.indexOf('category');
  const idxNotes = headerLower.indexOf('notes');
  const idxTags = headerLower.indexOf('tags');
  const idxThumb = headerLower.indexOf('thumbnail');

  if (idxTitle === -1 || idxDesc === -1) {
    console.error('CSV 至少需要包含 Title 和 Body 两列（不区分大小写）');
    process.exit(1);
  }

  const updatedRows = rows.map((cols, rowIndex) => {
    const title = cols[idxTitle] || '';
    const category = idxCategory >= 0 ? cols[idxCategory] || '' : '';
    const notes = idxNotes >= 0 ? cols[idxNotes] || '' : '';
    const tags = idxTags >= 0 ? cols[idxTags] || '' : '';
    const hasThumbnail =
      idxThumb >= 0 && !!(cols[idxThumb] && cols[idxThumb].trim());

    const intro = generateIntro({
      title,
      category,
      notes,
      tags,
      hasThumbnail,
    });

    const newCols = cols.slice();
    newCols[idxDesc] = intro;

    // 简单日志，方便人工检查
    if (rowIndex < 5) {
      // 只打印前几条，避免刷屏
      // eslint-disable-next-line no-console
      console.log(
        `Row ${rowIndex + 1}: "${title}" => Intro length: ${intro.length}`
      );
    }

    return newCols;
  });

  const output = stringifyCSV(header, updatedRows);

  // 确保输出目录存在
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, output, 'utf8');

  console.log('');
  console.log('✓ 已生成模板简介并写入 CSV');
  console.log(`  输入文件: ${inputPath}`);
  console.log(`  输出文件: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseCSVLine,
  parseCSV,
  stringifyCSV,
  generateIntro,
};
