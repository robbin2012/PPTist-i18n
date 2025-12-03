#!/usr/bin/env node

/**
 * Patch Body of timeline-infogrpahics nodes on Drupal
 *
 * - 从 utilities/test/timeline-infogrpahics.csv 读取每一行
 * - 根据 Title / Item Count / Notes 生成英文 Body 文本（两段描述）
 * - 回写 CSV 的 Body 列
 * - 通过 JSON:API 用 unique_key（即 Slide JSON 路径）找到对应 node
 *   并 PATCH 其 body 字段
 *
 * 要求：
 *   DRUPAL_BASE_URL / DRUPAL_USER / DRUPAL_PASS 可以通过环境变量覆盖
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { parseCSV, stringifyCSV } = require('./pptist-generate-intro.cjs');
const { DrupalClient } = require('./post-csv-to-drupal.cjs');

function httpRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      rejectUnauthorized: false,
    };

    const req = protocol.request(requestOptions, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        let parsed = body;
        try {
          const ct = res.headers['content-type'] || '';
          if (ct.includes('application/json') || ct.includes('application/vnd.api+json')) {
            parsed = JSON.parse(body);
          }
        } catch {
          // keep raw body
        }
        resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (data) req.write(data);
    req.end();
  });
}

function generateTimelineBody({ title, itemCount, notes }) {
  const cleanTitle = (title || '').trim() || 'This timeline template';

  const count = Number(itemCount) || 0;
  let countPhrase;
  if (count === 0) {
    countPhrase = 'a clear sequence of milestones';
  } else if (count === 1) {
    countPhrase = 'one key milestone';
  } else {
    countPhrase = `${count} key milestones`;
  }

  let ruleSentence = '';
  if (/Item Title should be 1 word/i.test(notes) || /List Item Title should be 1 word/i.test(notes)) {
    ruleSentence =
      'Each item title is intentionally kept to a single word, which makes the labels punchy and keeps the yellow‑and‑pink accents from feeling crowded on the timeline.';
  }

  const intro1 =
    `${cleanTitle} is a reusable timeline infographic template built around a yellow‑and‑pink inspired color palette. ` +
    `It works well in project roadmaps, product launch plans, campaign schedules, or event timelines where you need to show how important moments unfold over time. ` +
    `The design balances strong color highlights with clean typography so that the chronology stays readable even when you present on a large screen.`;

  const intro2Parts = [];

  intro2Parts.push(
    `The layout arranges ${countPhrase} along a horizontal path, with space for a short title and supporting text at each point so viewers can understand both the date and the meaning behind it at a glance.`
  );

  if (ruleSentence) {
    intro2Parts.push(ruleSentence);
  }

  intro2Parts.push(
    'You can replace the placeholder years and copy with your own schedule, keep the yellow‑and‑pink styling for brand consistency, and reuse this slide as part of a larger series of data‑driven visuals.'
  );

  const intro2 = intro2Parts.join(' ');

  // 两段，中间用空行分隔，Markdown 会渲染为两个段落
  return `${intro1}\n\n${intro2}`;
}

async function main() {
  const inputPath = 'utilities/test/timeline-infogrpahics.csv';

  if (!fs.existsSync(inputPath)) {
    console.error(`CSV not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const { header, rows } = parseCSV(raw);
  if (!header || header.length === 0) {
    console.error('CSV header is empty.');
    process.exit(1);
  }

  const headerLower = header.map(h => (h || '').toString().trim().toLowerCase());
  const idxTitle = headerLower.indexOf('title');
  const idxBody = headerLower.indexOf('body');
  const idxItemCount = headerLower.indexOf('item count');
  const idxNotes = headerLower.indexOf('notes');
  const idxSlideJson = headerLower.indexOf('slide json');

  if (idxTitle === -1 || idxBody === -1 || idxSlideJson === -1) {
    console.error('CSV must contain Title, Body and Slide JSON columns.');
    process.exit(1);
  }

  // 1) 生成新的 Body 并回写 CSV
  const updatedRows = rows.map((cols, rowIndex) => {
    const title = cols[idxTitle] || '';
    const itemCount = cols[idxItemCount] || '';
    const notes = idxNotes >= 0 ? cols[idxNotes] || '' : '';

    const body = generateTimelineBody({ title, itemCount, notes });

    const next = cols.slice();
    next[idxBody] = body;

    if (rowIndex < 3) {
      console.log(`Row ${rowIndex + 1}: "${title}" -> body length ${body.length}`);
    }

    return next;
  });

  const outCsv = stringifyCSV(header, updatedRows);
  fs.writeFileSync(inputPath, outCsv, 'utf8');
  console.log('');
  console.log('✓ CSV Body column updated for timeline-infogrpahics.csv');

  // 2) PATCH Drupal 节点 body 字段
  const baseUrl = process.env.DRUPAL_BASE_URL || 'https://aigraphmaker.net';
  const username = process.env.DRUPAL_USER || 'admin';
  const password = process.env.DRUPAL_PASS || 'cloud801AAB';

  const client = new DrupalClient(baseUrl, username, password);

  console.log(`\nLogging in to ${baseUrl} ...`);
  await client.login();

  const headers = await client.getHeaders();

  const results = {
    total: updatedRows.length,
    patched: 0,
    failed: 0,
  };

  for (let i = 0; i < updatedRows.length; i++) {
    const cols = updatedRows[i];
    const title = cols[idxTitle] || '';
    const body = cols[idxBody] || '';
    const slideJsonRel = cols[idxSlideJson] || '';
    const uniqueKey = slideJsonRel;

    if (!uniqueKey) {
      console.warn(`Row ${i + 1}: missing Slide JSON path, skip patch.`);
      results.failed++;
      continue;
    }

    try {
      const filterValue = encodeURIComponent(uniqueKey);
      const url =
        `${baseUrl}/jsonapi/node/infographic_template` +
        `?filter[unique_key][condition][path]=unique_key` +
        `&filter[unique_key][condition][value]=${filterValue}`;

      const res = await httpRequest(url, { method: 'GET', headers: await client.getHeaders(false) });

      if (res.statusCode !== 200 || !res.data || !Array.isArray(res.data.data) || res.data.data.length === 0) {
        console.warn(`Row ${i + 1}: node not found for unique_key="${uniqueKey}"`);
        results.failed++;
        continue;
      }

      const node = res.data.data[0];
      const nodeId = node.id;
      const nid = node.attributes?.drupal_internal__nid;

      const payload = JSON.stringify({
        data: {
          type: 'node--infographic_template',
          id: nodeId,
          attributes: {
            body: {
              value: body,
              summary: body,
              format: 'markdown',
            },
          },
        },
      });

      const patchUrl = `${baseUrl}/jsonapi/node/infographic_template/${nodeId}`;
      const patchRes = await httpRequest(patchUrl, { method: 'PATCH', headers }, payload);

      if (patchRes.statusCode === 200) {
        console.log(`✓ Patched node ${nid} (${title})`);
        results.patched++;
      } else {
        console.error(
          `✗ Failed to patch node ${nid} (${title}), status ${patchRes.statusCode}`,
          typeof patchRes.data === 'string' ? patchRes.data.slice(0, 200) : JSON.stringify(patchRes.data).slice(0, 200)
        );
        results.failed++;
      }
    } catch (e) {
      console.error(`✗ Error patching row ${i + 1}:`, e.message || e);
      results.failed++;
    }
  }

  console.log('\nPatch summary:');
  console.log(`  Total rows:   ${results.total}`);
  console.log(`  Patched ok:   ${results.patched}`);
  console.log(`  Failed/skipped: ${results.failed}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

