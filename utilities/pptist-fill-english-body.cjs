#!/usr/bin/env node

/**
 * Enrich PPTist CSV: set better Title, English Body, and Tags.
 *
 * 功能（目前主要用于 pptist-03.1.csv）：
 *   - 从单页 JSON（Slide JSON 列）里读取 slide 的 title（textType: "title"）；
 *   - 如果 JSON 里没有 title，或是占位的“Subject Here / Lorem ipsum”，则为该页起一个合适的英文标题；
 *   - 按 USAGE.md 里的思路，生成约两段的英文简介写入 Body 列；
 *   - 修正 Item Count（统计 text.itemTitle + shape.text.itemTitle）；
 *   - 将 Tags 列统一改为 "Blue-Cyan-Orange"；
 *   - 将 Category 列统一改为 "Information"（对应 Drupal 里的 tid=4）。
 *
 * 用法：
 *   node utilities/pptist-fill-english-body.cjs utilities/test/pptist-03.1.csv
 *   # 或输出到新文件：
 *   node utilities/pptist-fill-english-body.cjs utilities/test/pptist-03.1.csv utilities/test/pptist-03.1.filled.csv
 */

const fs = require('fs');
const path = require('path');
const { parseCSV, stringifyCSV } = require('./pptist-generate-intro.cjs');

function extractTextFromHTML(html) {
  if (!html) return '';
  let text = html.replace(/<[^>]*>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * 从单页 JSON 中提取 slide title 文本
 * @param {string} slideJsonPath
 * @returns {string}
 */
function detectSlideTitle(slideJsonPath) {
  try {
    const raw = fs.readFileSync(slideJsonPath, 'utf8');
    const doc = JSON.parse(raw);
    const slide = (doc.slides || [])[0] || {};
    const elements = Array.isArray(slide.elements) ? slide.elements : [];

    // 1) text 元素里 textType === "title"
    const textTitle = elements.find(
      (el) => el.type === 'text' && el.textType === 'title' && el.content
    );
    if (textTitle) {
      const t = extractTextFromHTML(textTitle.content);
      if (t) return t;
    }

    // 2) shape.text 里 type === "title"
    const shapeTitle = elements.find(
      (el) =>
        el.type === 'shape' &&
        el.text &&
        el.text.type === 'title' &&
        el.text.content
    );
    if (shapeTitle) {
      const t = extractTextFromHTML(shapeTitle.text.content);
      if (t) return t;
    }

    // 3) 回退：第一个 itemTitle 也算一个候选
    const itemTitle = elements.find(
      (el) => el.type === 'text' && el.textType === 'itemTitle' && el.content
    );
    if (itemTitle) {
      const t = extractTextFromHTML(itemTitle.content);
      if (t) return t;
    }
  } catch (e) {
    // ignore
  }
  return '';
}

/**
 * 为没有显式 title 的页，按行号起一个主标题
 * 行号从 1 开始（CSV 第 2 行是第 1 个 slide）
 * @param {number} index1
 * @returns {string}
 */
function fallbackTitle(index1) {
  switch (index1) {
    case 3:
      return 'Four Key Highlights';
    case 4:
      return 'Idea to Success Roadmap';
    case 7:
      return 'Idea to Success Circular Workflow';
    case 13:
      return 'Multi-Year Milestone Timeline';
    case 14:
      return 'Four-Step Progress Bars';
    case 18:
      return 'Chevron Progress Overview';
    default:
      return `Infographic Template ${index1}`;
  }
}

/**
 * 根据 Title / Category / Notes 生成英文简介（两段 Markdown 文本）
 * @param {Object} ctx
 * @param {string} ctx.title
 * @param {string} ctx.category
 * @param {string} ctx.notes
 * @returns {string}
 */
function generateEnglishIntro({ title, category, notes }) {
  const cleanTitle = (title || '').trim() || 'This infographic template';
  const categoryKey = (category || '').toLowerCase();
  const isDiagram = categoryKey === 'diagram';
  const categoryPhrase = isDiagram ? 'diagram slide' : 'content slide';

  let ruleSentence = '';
  if (/Item Title should be only 1 word/i.test(notes)) {
    ruleSentence +=
      'Each item title is designed to be a single word, which keeps the labels punchy and the layout visually clean.';
  } else if (/Item Title should be limit(ed)? in 2 words/i.test(notes)) {
    ruleSentence +=
      'Each item title is intended to be very short (around one to two words), so the headings stay readable even from a distance.';
  }
  if (/Item Description/i.test(notes) || /不少于30个words/.test(notes)) {
    ruleSentence +=
      (ruleSentence ? ' ' : '') +
      'The description area provides enough space for longer explanations, making it easy to turn each item into a mini story.';
  }

  const intro1 =
    `${cleanTitle} is a reusable ${categoryPhrase} built around a Blue–Cyan–Orange color palette. ` +
    `It works well in business presentations, project reports, and marketing decks where you need to explain a concept, process, or set of highlights on a single slide. ` +
    `The design balances bold color blocks with clear typography so that key messages stand out without overwhelming the viewer.`;

  const layoutSentence = isDiagram
    ? 'The layout focuses on a central visual structure with clearly separated segments, making it easy to walk the audience through each step or component in order.'
    : 'The layout arranges the main heading and supporting text into distinct blocks, so viewers can quickly scan from one key point to the next.';

  const intro2Parts = [
    layoutSentence,
    ruleSentence,
    'You can replace the placeholder labels and text with your own content, keep the Blue–Cyan–Orange styling for consistency, and reuse this slide as part of a larger sequence of modern, data‑driven visuals.',
  ].filter(Boolean);

  const intro2 = intro2Parts.join(' ');
  // 为了避免 CSV 解析多行字段问题，这里用单段文本（中间用空格连接）
  return `${intro1} ${intro2}`;
}

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'utilities/test/pptist-03.1.csv';
  const outputPath = args[1] || inputPath;

  if (!fs.existsSync(inputPath)) {
    console.error(`Input CSV not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const { header, rows } = parseCSV(raw);
  if (!header || header.length === 0) {
    console.error('CSV header is empty.');
    process.exit(1);
  }

  const headerLower = header.map((h) => (h || '').toString().trim().toLowerCase());
  const idxTitle = headerLower.indexOf('title');
  const idxBody = headerLower.indexOf('body');
  const idxCategory = headerLower.indexOf('category');
  const idxTags = headerLower.indexOf('tags');
  const idxNotes = headerLower.indexOf('notes');
  const idxThumb = headerLower.indexOf('thumbnail');
  const idxSlideJson = headerLower.indexOf('slide json');
  const idxItemCount = headerLower.indexOf('item count');

  if (idxTitle === -1 || idxBody === -1) {
    console.error('CSV must contain at least Title and Body columns.');
    process.exit(1);
  }

  const csvDir = path.dirname(inputPath);

  const updatedRows = rows.map((cols, rowIndex) => {
    const index1 = rowIndex + 1; // human-friendly slide index

    const currentTitle = cols[idxTitle] || '';
    const categoryRaw = idxCategory >= 0 ? cols[idxCategory] || '' : '';
    const notes = idxNotes >= 0 ? cols[idxNotes] || '' : '';
    const slideJsonRel =
      idxSlideJson >= 0 && cols[idxSlideJson] ? cols[idxSlideJson] : '';

    let bestTitle = currentTitle;

    // 优先从 Slide JSON 中拿 title
    if (slideJsonRel) {
      const slideJsonPath = path.join(csvDir, slideJsonRel);
      if (fs.existsSync(slideJsonPath)) {
        const jsonTitle = detectSlideTitle(slideJsonPath);
        if (jsonTitle) {
          bestTitle = jsonTitle;
        }
      }
    }

    // 如果还是占位的 Lorem ipsum / Subject Here 或为空，则给一个 fallback 名字
    const isLorem =
      !bestTitle ||
      /^lorem ipsum/i.test(bestTitle) ||
      /^Lorem ipsum/i.test(bestTitle) ||
      /^Subject Here$/i.test(bestTitle);
    if (isLorem) {
      bestTitle = fallbackTitle(index1);
    }

    const intro = generateEnglishIntro({
      title: bestTitle,
      category: categoryRaw,
      notes,
    });

    const newCols = cols.slice();
    newCols[idxTitle] = bestTitle;
    newCols[idxBody] = intro;
    // 统一 Tags
    if (idxTags >= 0) {
      newCols[idxTags] = 'Blue-Cyan-Orange';
    }
    // 统一 Category
    if (idxCategory >= 0) {
      newCols[idxCategory] = 'Information';
    }

    // 修正 Item Count：统计 text.itemTitle + shape.text.itemTitle
    if (idxItemCount >= 0 && slideJsonRel) {
      const slideJsonPath = path.join(csvDir, slideJsonRel);
      if (fs.existsSync(slideJsonPath)) {
        try {
          const rawSlide = fs.readFileSync(slideJsonPath, 'utf8');
          const doc = JSON.parse(rawSlide);
          const slide = (doc.slides || [])[0] || {};
          const elements = Array.isArray(slide.elements) ? slide.elements : [];
          const textCount = elements.filter(
            (el) => el.type === 'text' && el.textType === 'itemTitle'
          ).length;
          const shapeCount = elements.filter(
            (el) => el.type === 'shape' && el.text && el.text.type === 'itemTitle'
          ).length;
          newCols[idxItemCount] = String(textCount + shapeCount);
        } catch (e) {
          // 如果解析失败，就保留原值
        }
      }
    }

    // 简短日志帮助检查前几条
    if (rowIndex < 5) {
      console.log(
        `Row ${index1}: Title -> "${bestTitle}", Body length: ${intro.length}`
      );
    }

    return newCols;
  });

  const outputCSV = stringifyCSV(header, updatedRows);
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, outputCSV, 'utf8');

  console.log('');
  console.log('✓ Filled English Body and updated Titles/Tags');
  console.log(`  Input : ${inputPath}`);
  console.log(`  Output: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  detectSlideTitle,
  fallbackTitle,
  generateEnglishIntro,
};
