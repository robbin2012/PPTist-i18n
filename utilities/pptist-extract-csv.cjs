#!/usr/bin/env node

/**
 * PPTist JSON to CSV Converter
 *
 * This utility parses PPTist JSON files and generates a CSV file with slide information
 * including title, description, item count, category, tags, and thumbnail paths.
 *
 * Usage:
 *   node utilities/pptist-extract-csv.js <input.json> [output.csv]
 *
 * Features:
 * - Extracts slide metadata (title, description, item count)
 * - Generates thumbnail references for each slide
 * - Categorizes slides by type
 * - Analyzes color themes for tagging
 * - Exports data in CSV format for Drupal import
 */

const fs = require('fs');
const path = require('path');

// Constants
const DEFAULT_OUTPUT_DIR = 'output';
const DEFAULT_IMAGE_DIR = 'images';

/**
 * Extract text content from HTML string
 * @param {string} html - HTML content
 * @returns {string} Plain text
 */
function extractTextFromHTML(html) {
  if (!html) return '';

  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Analyze slide type based on elements
 * @param {Object} slide - Slide object
 * @returns {string} Slide type/category
 */
function detectSlideType(slide) {
  if (slide.type) {
    const typeMap = {
      'cover': 'Cover',
      'contents': 'Table of Contents',
      'transition': 'Transition',
      'content': 'Content',
      'end': 'End'
    };
    return typeMap[slide.type] || 'Content';
  }

  const elements = slide.elements || [];
  if (elements.length === 0) return 'Blank';

  const hasTitle = elements.some(el => el.type === 'text' && (el.textType === 'title' || el.textType === 'itemTitle'));
  const hasChart = elements.some(el => el.type === 'chart');
  const hasTable = elements.some(el => el.type === 'table');
  const hasImage = elements.some(el => el.type === 'image');
  const hasShape = elements.some(el => el.type === 'shape');

  if (hasChart) return 'Chart';
  if (hasTable) return 'Table';
  if (hasImage && hasTitle) return 'Image with Title';
  if (hasShape && hasTitle) return 'Diagram';
  if (hasTitle) return 'Title and Content';

  return 'Content';
}

/**
 * Determine color theme tags based on background color
 * @param {Object} background - Slide background
 * @returns {string} Color theme tag
 */
function getColorTheme(background) {
  if (!background) return 'Default';

  if (background.type === 'solid' && background.color) {
    const color = background.color.toLowerCase();

    // Parse hex color
    const hex = color.replace('#', '');
    if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      // Determine color family
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;

      if (lightness > 220) return 'Light';
      if (lightness < 40) return 'Dark';

      // Color hue detection
      const diff = max - min;
      if (diff < 30) return 'Neutral';

      if (r > g && r > b) {
        if (g > 100) return 'Warm'; // Red-orange tones
        return 'Red';
      }
      if (b > r && b > g) {
        if (b > 150 && g > 100) return 'Cool'; // Blue-green
        return 'Blue';
      }
      if (g > r && g > b) {
        return 'Fresh'; // Green tones
      }

      return 'Colorful';
    }
  }

  if (background.type === 'gradient') {
    return 'Gradient';
  }

  if (background.type === 'image') {
    return 'Image Background';
  }

  return 'Default';
}

/**
 * Extract slide title
 * @param {Array|Object} elementsOrSlide - Slide elements array or slide object
 * @returns {string} Slide title
 */
function extractTitle(elementsOrSlide) {
  let elements;
  if (Array.isArray(elementsOrSlide)) {
    elements = elementsOrSlide;
  } else if (elementsOrSlide && Array.isArray(elementsOrSlide.elements)) {
    elements = elementsOrSlide.elements;
  } else {
    return 'Untitled Slide';
  }

  if (!elements || elements.length === 0) return 'Untitled Slide';

  // 1) 优先使用 textType === "title" 的 text 元素
  const titleElement = elements.find(
    el => el.type === 'text' && el.textType === 'title' && el.content
  );
  if (titleElement) {
    const title = extractTextFromHTML(titleElement.content);
    if (title.length > 0 && title.length <= 100) {
      return title;
    }
  }

  // 2) 其次使用 shape.text.type === "title"
  const shapeTitle = elements.find(
    el =>
      el.type === 'shape' &&
      el.text &&
      el.text.type === 'title' &&
      el.text.content
  );
  if (shapeTitle) {
    const title = extractTextFromHTML(shapeTitle.text.content);
    if (title.length > 0 && title.length <= 100) {
      return title;
    }
  }

  // 3) 再其次使用 itemTitle（text 或 shape.text）
  const itemTitleText = elements.find(
    el => el.type === 'text' && el.textType === 'itemTitle' && el.content
  );
  if (itemTitleText) {
    const title = extractTextFromHTML(itemTitleText.content);
    if (title.length > 0 && title.length <= 100) {
      return title;
    }
  }

  const itemTitleShape = elements.find(
    el =>
      el.type === 'shape' &&
      el.text &&
      el.text.type === 'itemTitle' &&
      el.text.content
  );
  if (itemTitleShape) {
    const title = extractTextFromHTML(itemTitleShape.text.content);
    if (title.length > 0 && title.length <= 100) {
      return title;
    }
  }

  // 4) Fallback: 第一个普通 text 元素
  const firstText = elements.find(el => el.type === 'text' && el.content);
  if (firstText) {
    const text = extractTextFromHTML(firstText.content);
    return text.substring(0, 50) + (text.length > 50 ? '...' : '');
  }

  // 5) 再退一步：第一个 shape.text
  const firstShapeText = elements.find(
    el => el.type === 'shape' && el.text && el.text.content
  );
  if (firstShapeText) {
    const text = extractTextFromHTML(firstShapeText.text.content);
    return text.substring(0, 50) + (text.length > 50 ? '...' : '');
  }

  return 'Untitled Slide';
}

/**
 * Extract slide description (summary of content)
 * @param {Array} elements - Slide elements
 * @param {number} maxLength - Maximum description length
 * @returns {string} Slide description
 */
function extractDescription(elements, maxLength = 100) {
  if (!elements || elements.length === 0) return '';

  // Collect all text content except title
  const textElements = elements
    .filter(el =>
      el.type === 'text' &&
      el.textType !== 'title' &&
      el.textType !== 'itemTitle' &&
      el.content
    )
    .map(el => extractTextFromHTML(el.content))
    .filter(text => text.length > 0);

  if (textElements.length === 0) return '';

  const fullText = textElements.join(' ');

  // Truncate to maxLength
  if (fullText.length <= maxLength) {
    return fullText;
  }

  // Smart truncate at word boundary
  const truncated = fullText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Count content items in slide
 * @param {Array} elements - Slide elements
 * @returns {number} Item count
 */
function countItems(elements) {
  if (!Array.isArray(elements)) return 0;

  // 按模板约定，只统计列表项标题（textType === 'itemTitle'），
  // 既包括 text 元素，也包括 shape.text.type === 'itemTitle'
  return elements.filter(el => {
    if (!el) return false;
    if (el.textType === 'itemTitle') return true;
    if (
      el.type === 'shape' &&
      el.text &&
      el.text.type === 'itemTitle' &&
      el.text.content
    ) {
      return true;
    }
    return false;
  }).length;
}

/**
 * Extract slide notes
 * @param {Object} slide - Slide object
 * @returns {string} Notes text
 */
function extractNotes(slide) {
  if (!slide) return '';

  const elements = Array.isArray(slide.elements) ? slide.elements : [];

  // Prefer dedicated notes text element (textType === 'notes')
  const notesElement = elements.find(
    el => el.type === 'text' && el.textType === 'notes' && el.content
  );

  if (notesElement) {
    return extractTextFromHTML(notesElement.content);
  }

  // Fallback: use slide.remark if present
  if (typeof slide.remark === 'string' && slide.remark.trim()) {
    return extractTextFromHTML(slide.remark);
  }

  return '';
}

/**
 * Extract tags from notes text (fallback to color theme if not found)
 * @param {string} notes - Notes text
 * @param {Object} background - Slide background
 * @returns {string} Tags value
 */
function extractTagsFromNotes(notes, background) {
  if (notes && typeof notes === 'string') {
    // 从备注中提取 “主题” 或 “主题风格” 后面的描述，直到分号/句号/换行
    const match = notes.match(/(主题风格|主题)\s*[：:]\s*([^；;。\n]+)/);
    if (match && match[2]) {
      return match[2].trim();
    }
  }

  // 如果备注里没有主题信息，则退回到原来的颜色标签逻辑
  return getColorTheme(background);
}

/**
 * Escape CSV field
 * @param {string|number} field - Field value
 * @returns {string} Escaped field
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) return '';

  const str = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Generate thumbnail filename for slide
 * @param {number} index - Slide index
 * @returns {string} Thumbnail filename
 */
function generateThumbnailPath(index, slideId) {
  // Use simple sequential naming like 001.png, 002.png ...
  return `${String(index + 1).padStart(3, '0')}.png`;
}

/**
 * Generate JSON filename for slide
 * @param {number} index - Slide index
 * @param {string} slideId - Slide ID
 * @returns {string} JSON filename
 */
function generateSlideJsonFilename(index, slideId) {
  return `slide_${String(index + 1).padStart(3, '0')}_${slideId}.json`;
}

/**
 * Parse JSON file
 * @param {string} jsonPath - Path to JSON file
 * @returns {Object} Parsed data with slides and metadata
 */
function parseJSONFile(jsonPath) {
  console.log(`Reading file: ${jsonPath}`);

  const content = fs.readFileSync(jsonPath, 'utf8');

  console.log('Parsing JSON...');
  const data = JSON.parse(content);

  const { title = 'Untitled Presentation', slides = [] } = data;

  console.log(`Found ${slides.length} slides in presentation: "${title}"`);

  return {
    title,
    slides,
    theme: data.theme,
    width: data.width,
    height: data.height
  };
}

/**
 * Generate CSV from parsed data
 * @param {Object} data - Parsed presentation data
 * @param {string} imageDir - Default image directory path used in CSV (relative to CSV)
 * @param {Object} [options] - Additional options
 * @param {string[]} [options.slideJsonPaths] - Per-slide JSON paths (relative to CSV)
 * @param {string[]} [options.thumbnailPaths] - Per-slide thumbnail paths (relative to CSV)
 * @returns {string} CSV content
 */
function generateCSV(data, imageDir, options = {}) {
  const { slides } = data;
  const { slideJsonPaths, thumbnailPaths } = options;

  // CSV Header
  const headers = [
    'Title',
    'Body',
    'Item Count',
    'Category',
    'Tags',
    'Notes',
    'Thumbnail',
    'Slide JSON'
  ];

  const rows = [headers];

  slides.forEach((slide, index) => {
    const title = extractTitle(slide.elements);
    const description = extractDescription(slide.elements, 100);
    const notes = extractNotes(slide);
    const itemCount = countItems(slide.elements);
    const category = detectSlideType(slide);
    const tags = extractTagsFromNotes(notes, slide.background);
    let thumbnail;
    if (Array.isArray(thumbnailPaths)) {
      // When explicit thumbnail paths are provided, use them directly (may be empty)
      thumbnail = thumbnailPaths[index] || '';
    } else {
      // Fallback: derive thumbnail path from imageDir and slide id
      thumbnail = path.join(imageDir, generateThumbnailPath(index, slide.id));
    }
    const slideJsonPath =
      Array.isArray(slideJsonPaths) && slideJsonPaths[index]
        ? slideJsonPaths[index]
        : '';

    rows.push([
      escapeCSVField(title),
      escapeCSVField(description),
      escapeCSVField(itemCount),
      escapeCSVField(category),
      escapeCSVField(tags),
      escapeCSVField(notes),
      escapeCSVField(thumbnail),
      escapeCSVField(slideJsonPath)
    ]);
  });

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node pptist-extract-csv.js <input.json> [output.csv] [image-dir]');
    console.error('');
    console.error('Example:');
    console.error('  node utilities/pptist-extract-csv.js pptx/presentation.json output/slides.csv images');
    console.error('');
    console.error('The CSV file will contain:');
    console.error('  - Title: Slide title');
    console.error('  - Body: ~100 character summary (can be later replaced by AI-generated markdown)');
    console.error('  - Item Count: Number of content items');
    console.error('  - Category: Slide type (Cover, Content, Chart, etc.)');
    console.error('  - Tags: Color theme (Light, Dark, Warm, Cool, etc.)');
    console.error('  - Thumbnail: Path to thumbnail image file');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || path.join(DEFAULT_OUTPUT_DIR, 'slides.csv');
  const imageDir = args[2] || DEFAULT_IMAGE_DIR;

  // Check input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    // Parse JSON file
    const data = parseJSONFile(inputPath);

  // Prepare output and assets directories
  const outputDir = path.dirname(outputPath);
  const outputBaseName = path.basename(outputPath, path.extname(outputPath));
  const assetsDirName = `${outputBaseName}_assets`;
  const assetsDir = path.join(outputDir, assetsDirName);
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    console.log(`Creating output directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    console.log(`Creating assets directory: ${assetsDir}`);
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Write per-slide JSON files；缩略图不再自动从 base64 生成，仅预留文件名占位
  const slideJsonPaths = [];
  data.slides.forEach((slide, index) => {
    const jsonFilename = generateSlideJsonFilename(index, slide.id);
    const jsonFilePath = path.join(assetsDir, jsonFilename);

      // 为每一页生成一个可直接在 PPTist 中导入的 JSON 文件
      // 结构与整体导出的 JSON 一致：包含 width/height/theme，并且 slides 为单页数组
      const slideJson = {
        title: data.title || 'Untitled Presentation',
        width: data.width,
        height: data.height,
        theme: data.theme,
      slides: [slide],
    };

    fs.writeFileSync(jsonFilePath, JSON.stringify(slideJson, null, 2), 'utf8');

    // Path stored in CSV should be relative to CSV file
    slideJsonPaths.push(path.join(assetsDirName, jsonFilename));
  });

  // Generate CSV
  console.log('Generating CSV...');
  // 不传 thumbnailPaths，交给 generateCSV 使用约定的文件名
  const csv = generateCSV(data, assetsDirName, { slideJsonPaths });

    // Write CSV file
    fs.writeFileSync(outputPath, csv, 'utf8');

    console.log('');
    console.log('✓ CSV file generated successfully!');
  console.log(`  Output: ${outputPath}`);
  console.log(`  Slides: ${data.slides.length}`);
  console.log(`  Assets directory: ${assetsDir}`);
  console.log(`  Images directory (place your exported thumbnails here): ${assetsDir}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Export slides as images to generate thumbnails');
    console.log('  2. Import CSV into Drupal');

  } catch (error) {
    console.error('Error processing file:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  parseJSONFile,
  generateCSV,
  extractTitle,
  extractDescription,
  extractNotes,
  countItems,
  detectSlideType,
  getColorTheme,
  extractTagsFromNotes,
  generateSlideJsonFilename,
};
