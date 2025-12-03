#!/usr/bin/env node

/**
 * One-off helper: update template_file of node 12117 on aigraphmaker.net
 * to use the normalized slide_005_g28T_16jmJ.json.
 *
 * 依赖：
 *   - utilities/post-csv-to-drupal.cjs 里的 DrupalClient
 *   - 环境变量可选覆盖 DRUPAL_BASE_URL / DRUPAL_USER / DRUPAL_PASS
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { DrupalClient } = require('./post-csv-to-drupal.cjs');

function request(url, options = {}, data = null) {
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
        let parsedData = body;
        try {
          const ct = res.headers['content-type'] || '';
          if (ct.includes('application/json') || ct.includes('application/vnd.api+json')) {
            parsedData = JSON.parse(body);
          }
        } catch {
          // ignore parse error, keep raw body
        }
        resolve({ statusCode: res.statusCode, data: parsedData, headers: res.headers });
      });
    });

    req.on('error', reject);

    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const baseUrl = process.env.DRUPAL_BASE_URL || 'https://aigraphmaker.net';
  const username = process.env.DRUPAL_USER || 'admin';
  const password = process.env.DRUPAL_PASS || 'cloud801AAB';

  const client = new DrupalClient(baseUrl, username, password);

  console.log(`Logging in to ${baseUrl} ...`);
  await client.login();

  // 1) 上传更新后的 slide JSON，获取新的 file--file UUID
  const jsonPath = path.join(__dirname, 'test', 'pptist-05_assets', 'slide_005_g28T_16jmJ.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Slide JSON not found: ${jsonPath}`);
  }

  console.log('Uploading updated template JSON...');
  const fileId = await client.uploadFileForNodeField(
    'infographic_template',
    'template_file',
    jsonPath,
    path.basename(jsonPath)
  );

  if (!fileId) {
    throw new Error('Failed to upload template JSON file.');
  }

  console.log('New file UUID:', fileId);

  // 2) PATCH 节点 12117 的 template_file 关系
  const nodeId = 'fe97231b-e01d-4fa7-bcf5-6de371f71068'; // nid 12117 对应的 UUID

  const headers = await client.getHeaders();
  const payload = JSON.stringify({
    data: {
      type: 'file--file',
      id: fileId,
      meta: {
        description: null,
      },
    },
  });

  const url = `${baseUrl}/jsonapi/node/infographic_template/${nodeId}/relationships/template_file`;
  console.log('Patching template_file relationship for node 12117...');

  const res = await request(url, { method: 'PATCH', headers }, payload);
  console.log('Status:', res.statusCode);
  if (res.statusCode !== 200 && res.statusCode !== 204) {
    console.error('Error body:', res.data);
    process.exit(1);
  }

  console.log('✓ Template file updated for node 12117');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

