#!/usr/bin/env node

/**
 * Fill English Body / Category / Tags for pptist-05.csv (timeline pack).
 *
 * 功能：
 *   - 针对 utilities/test/pptist-05.csv 这 6 条时间轴模板：
 *     - 根据 Title + Notes 生成一段英文简介写入 Body；
 *     - Category 统一改为 "Timeline"；
 *     - Tags 统一改为 "Black-purple-timeline"。
 *
 * 用法：
 *   # 覆盖原文件
 *   node utilities/pptist-fill-english-body-05.cjs utilities/test/pptist-05.csv
 *
 *   # 或输出到新文件
 *   node utilities/pptist-fill-english-body-05.cjs utilities/test/pptist-05.csv utilities/test/pptist-05.filled.csv
 */

const fs = require('fs');
const path = require('path');
const { parseCSV, stringifyCSV } = require('./pptist-generate-intro.cjs');

function generateTimelineIntro(index1, title, notes) {
  const cleanTitle = (title || '').trim() || 'This timeline slide';

  // 通用首句：黑+紫时间轴主题
  const intro1 =
    `${cleanTitle} is a reusable timeline slide built around a dark black‑and‑purple theme with bright accent colors. ` +
    `It works well in business presentations and project decks where you need to show how key milestones unfold over time.`;

  let layoutSentence = '';
  switch (index1) {
    case 1:
      layoutSentence =
        'Four large date markers are staggered across the slide with short descriptions beside each one, so the audience can quickly follow the story from the first milestone to the last.';
      break;
    case 2:
      layoutSentence =
        'A central horizontal bar with vertical tick marks anchors the timeline, while colored strips and percentage callouts highlight the progress at each stage across the months.';
      break;
    case 3:
      layoutSentence =
        'A clean horizontal path runs through three stops, with travel‑style icons and caption areas that make it easy to outline the destination, date, and key note for each stage of the journey.';
      break;
    case 4:
      layoutSentence =
        'A long pencil graphic stretches across the canvas and is divided into colored segments, giving you five clearly defined steps with matching labels and descriptions.';
      break;
    case 5:
      layoutSentence =
        'Tall colored columns flow down into rounded timeline blocks, creating six parallel lanes where you can compare options, scenarios, or workstreams side by side.';
      break;
    case 6:
      layoutSentence =
        'A row of numbered circular markers and connected shapes highlights each phase, with nearby text blocks that let you briefly explain what happens in every step of the plan.';
      break;
    default:
      layoutSentence =
        'The layout combines bold timeline markers with clear caption areas so viewers can scan each milestone at a glance.';
  }

  let ruleSentence = '';
  if (/2 words/i.test(notes)) {
    ruleSentence =
      'Each item title is intended to be very short (around two words), which keeps the labels punchy and easy to scan even when the slide is projected in a large room.';
  } else if (/3 words/i.test(notes)) {
    ruleSentence =
      'Each item title is designed to use up to three words, giving you room for descriptive, action‑oriented labels without crowding the dark background.';
  } else if (/4 words/i.test(notes)) {
    ruleSentence =
      'Each item title is designed to use up to four words, so you can write clear, meaningful headings while still keeping the overall layout tidy.';
  }

  const closingSentence =
    'You can replace the placeholder months, labels, and copy with your own milestones and reuse this template as part of a consistent timeline series across multiple presentations.';

  const parts = [intro1, layoutSentence, ruleSentence, closingSentence].filter(
    Boolean
  );
  return parts.join(' ');
}

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'utilities/test/pptist-05.csv';
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

  const headerLower = header.map((h) =>
    (h || '').toString().trim().toLowerCase()
  );
  const idxTitle = headerLower.indexOf('title');
  const idxBody = headerLower.indexOf('body');
  const idxCategory = headerLower.indexOf('category');
  const idxTags = headerLower.indexOf('tags');
  const idxNotes = headerLower.indexOf('notes');

  if (idxTitle === -1 || idxBody === -1) {
    console.error('CSV must contain at least Title and Body columns.');
    process.exit(1);
  }

  const updatedRows = rows.map((cols, rowIndex) => {
    const index1 = rowIndex + 1; // 第一条数据行为 1
    const title = cols[idxTitle] || '';
    const notes = idxNotes >= 0 ? cols[idxNotes] || '' : '';

    const intro = generateTimelineIntro(index1, title, notes);

    const next = cols.slice();
    next[idxBody] = intro;
    if (idxCategory >= 0) {
      next[idxCategory] = 'Timeline';
    }
    if (idxTags >= 0) {
      next[idxTags] = 'Black-purple-timeline';
    }

    if (rowIndex < 3) {
      console.log(
        `Row ${index1}: Title="${title}", Body length=${intro.length}`
      );
    }

    return next;
  });

  const outCsv = stringifyCSV(header, updatedRows);
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, outCsv, 'utf8');

  console.log('');
  console.log('✓ Filled English Body and updated Category/Tags for pptist-05.csv');
  console.log(`  Input : ${inputPath}`);
  console.log(`  Output: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  generateTimelineIntro,
};

