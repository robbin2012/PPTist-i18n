#!/usr/bin/env node

/**
 * Fill Titles and English Bodies for pptist-04.csv
 *
 * - 为没有合适标题的行生成不易重复的英文标题（基于缩略图内容和已有结构）；
 * - 根据 USAGE 里的提示词，生成两段式英文 Body（无换行，方便 CSV）；
 * - 可选：统一 Category / Tags（这里先只处理 Title + Body，保留原 Category/Tags）。
 */

const fs = require('fs');
const path = require('path');
const { parseCSV, stringifyCSV } = require('./pptist-generate-intro.cjs');

function mapSlideTitle(idx1, currentTitle) {
  const clean = (currentTitle || '').trim();
  const isLorem = /^lorem ipsum/i.test(clean);
  const forceOverride = [1, 2, 3, 4, 5, 6, 8, 10, 11].includes(idx1);

  // 非占位文本且不在强制重写列表里，则保留原标题
  if (!forceOverride && clean && !isLorem) {
    return clean;
  }

  // 针对每一页给一个更具体、不易重复的标题
  switch (idx1) {
    case 1:
      return 'Eight-Step Learning to Startup Roadmap';
    case 2:
      return 'Six-Stage Chevron Strategy Flow';
    case 3:
      return 'Six-Step Hexagon Roadmap';
    case 4:
      return 'Five-Phase Hexagon Plan';
    case 5:
      return 'Four-Layer Growth Funnel';
    case 6:
      return 'Circular Business Model Overview';
    case 7:
      return 'Four-Part Structure Puzzle';
    case 8:
      return 'Eight-Stage Circular Growth Wheel';
    case 9:
      return 'Layered Development Stack';
    case 10:
      return 'Segmented Timeline Highlights';
    case 11:
      return 'Amazing Idea Circular Workflow';
    case 12:
      return 'Diamond Milestone Timeline';
    case 13:
      return 'Our Business Directions Map';
    case 14:
      return 'Four-Option Business Cycle';
    case 15:
      return 'Data Analytics Peaks Chart';
    case 16:
      return 'Colored Chevron Title Banner';
    default:
      return clean || `Infographic Template ${idx1}`;
  }
}

function generateEnglishBody(idx1, title, category) {
  const cleanTitle = (title || '').trim() || `This slide`;
  const cat = (category || '').toLowerCase();
  const isDiagram = cat === 'diagram';
  const slideTypePhrase = isDiagram ? 'diagram slide' : 'infographic slide';

  let layoutSentence = '';
  switch (idx1) {
    case 1:
      layoutSentence =
        'The layout arranges eight chevron segments in a vertical stack, with matching captions on both sides, making it easy to walk through each stage from 01 to 08.';
      break;
    case 2:
      layoutSentence =
        'Six chevron blocks cascade from top to bottom, while paired captions on the left and right provide space to label each stage or responsibility.';
      break;
    case 3:
      layoutSentence =
        'Six hexagon panels flow from left to right, each paired with a headline and icon so you can describe a clear, step‑by‑step journey.';
      break;
    case 4:
      layoutSentence =
        'Five hexagon shapes are linked across the page, with headline and icon pairs above and below, ideal for showing phases, scenarios, or options.';
      break;
    case 5:
      layoutSentence =
        'Four arrow blocks are stacked vertically in the center, with explanatory captions and icons on both sides, perfect for depicting a simple growth funnel.';
      break;
    case 6:
      layoutSentence =
        'A circular segmented graphic sits in the middle, surrounded by labels and icons, which helps you highlight different elements of a business model at a glance.';
      break;
    case 7:
      layoutSentence =
        'Four interconnected puzzle pieces form the core visual, with each quadrant linked to its corresponding caption and icon for a structured overview.';
      break;
    case 8:
      layoutSentence =
        'Eight colored segments radiate around a central circle, with numbered labels and side captions, making it easy to present a full 360‑degree cycle.';
      break;
    case 9:
      layoutSentence =
        'A stack of overlapping layers in the center is flanked by four caption blocks, providing a clear way to illustrate foundation, middle layers, and top layer.';
      break;
    case 10:
      layoutSentence =
        'An arrow‑based horizontal strip is divided into colored milestones, with icon‑title pairs above and below to describe each stage on the timeline.';
      break;
    case 11:
      layoutSentence =
        'A ring of colored segments surrounds a central IDEA label, with paired captions around the outside to show how different inputs support one big concept.';
      break;
    case 12:
      layoutSentence =
        'Six diamond shapes form a horizontal sequence, with numerical labels and supporting text positioned above and below for each step.';
      break;
    case 13:
      layoutSentence =
        'A vertical chain of circular icons in the center connects multiple options on both sides, giving you a clear visual route through different directions.';
      break;
    case 14:
      layoutSentence =
        'Four circular option blocks are placed along a loop around the BUSINESS CYCLE label, allowing you to describe each stage in a continuous process.';
      break;
    case 15:
      layoutSentence =
        'A series of overlapping, colored peaks shows eight steps with percentage values, making it ideal for comparing different stages or scenarios over time.';
      break;
    case 16:
      layoutSentence =
        'A row of upward and downward chevron blocks is framed by icons and short captions, providing a flexible banner for key categories or KPIs.';
      break;
    default:
      layoutSentence =
        'The layout balances a strong central visual with clear labels around it, so the audience can quickly scan and understand each key point.';
  }

  const intro1 =
    `${cleanTitle} is a reusable ${slideTypePhrase} built around a Blue–Cyan–Orange inspired palette. ` +
    `It works well in business presentations, project updates, and marketing decks where you need to explain a process, roadmap, or set of key ideas on a single slide. ` +
    `The design keeps the visuals bold while leaving enough white space so that text remains easy to read.`;

  const intro2 =
    `${layoutSentence} ` +
    `You can replace the placeholder labels and percentages with your own data, reuse the same color scheme for consistency across a series, and adapt this slide as part of a larger storytelling flow.`;

  return `${intro1} ${intro2}`;
}

function main() {
  const inputPath = process.argv[2] || 'utilities/test/pptist-04.csv';
  const outputPath = process.argv[3] || inputPath;

  if (!fs.existsSync(inputPath)) {
    console.error(`Input CSV not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const { header, rows } = parseCSV(raw);
  const headerLower = header.map(h => (h || '').toString().trim().toLowerCase());
  const idxTitle = headerLower.indexOf('title');
  const idxBody = headerLower.indexOf('body');
  const idxCategory = headerLower.indexOf('category');

  if (idxTitle === -1 || idxBody === -1) {
    console.error('CSV must have Title and Body columns.');
    process.exit(1);
  }

  const updated = rows.map((cols, i) => {
    const idx1 = i + 1;
    const oldTitle = cols[idxTitle] || '';
    const category = idxCategory >= 0 ? cols[idxCategory] || '' : '';
    const newTitle = mapSlideTitle(idx1, oldTitle);
    const body = generateEnglishBody(idx1, newTitle, category);

    const next = cols.slice();
    next[idxTitle] = newTitle;
    next[idxBody] = body;
    return next;
  });

  const outCsv = stringifyCSV(header, updated);
  fs.writeFileSync(outputPath, outCsv, 'utf8');

  console.log('Filled titles and bodies for pptist-04.csv');
  console.log(`  Input : ${inputPath}`);
  console.log(`  Output: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  mapSlideTitle,
  generateEnglishBody,
};
