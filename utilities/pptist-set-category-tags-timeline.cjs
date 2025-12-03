#!/usr/bin/env node

/**
 * Set Category/Tags for timeline CSV
 *
 * 功能：
 *   - 将 CSV 中的 Category 统一改为 "Timeline"
 *   - 将 Tags 统一改为 "Yellow-Pink-Timeline"
 *
 * 用法：
 *   node utilities/pptist-set-category-tags-timeline.cjs utilities/test/timeline-infogrpahics.csv
 *   # 或输出到新文件：
 *   node utilities/pptist-set-category-tags-timeline.cjs input.csv output.csv
 */

const fs = require('fs');
const path = require('path');
const { parseCSV, stringifyCSV } = require('./pptist-generate-intro.cjs');

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'utilities/test/timeline-infogrpahics.csv';
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

  const headerLower = header.map(h => (h || '').toString().trim().toLowerCase());
  const idxCategory = headerLower.indexOf('category');
  const idxTags = headerLower.indexOf('tags');

  if (idxCategory === -1 || idxTags === -1) {
    console.error('CSV must contain Category and Tags columns.');
    process.exit(1);
  }

  const updatedRows = rows.map((cols, i) => {
    const next = cols.slice();
    next[idxCategory] = 'Timeline';
    next[idxTags] = 'Yellow-Pink-Timeline';
    if (i < 3) {
      console.log(
        `Row ${i + 1}: Category="${cols[idxCategory]}" -> "${next[idxCategory]}", Tags="${cols[idxTags]}" -> "${next[idxTags]}"`
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
  console.log('✓ Updated Category and Tags for timeline CSV');
  console.log(`  Input : ${inputPath}`);
  console.log(`  Output: ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  // 导出方便以后复用
};

