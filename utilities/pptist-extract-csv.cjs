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
 * @param {Array} elements - Slide elements
 * @returns {string} Slide title
 */
function extractTitle(elements) {
  if (!elements || elements.length === 0) return 'Untitled Slide';

  // Look for title text element
  const titleElement = elements.find(el =>
    el.type === 'text' && (el.textType === 'title' || el.textType === 'itemTitle')
  );

  if (titleElement && titleElement.content) {
    const title = extractTextFromHTML(titleElement.content);
    if (title.length > 0 && title.length <= 100) {
      return title;
    }
  }

  // Fallback: get first text element
  const firstText = elements.find(el => el.type === 'text' && el.content);
  if (firstText) {
    const text = extractTextFromHTML(firstText.content);
    // Limit to first 50 characters for title
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
  if (!elements) return 0;

  let itemCount = 0;

  elements.forEach(el => {
    if (el.type === 'text' && el.content) {
      // Count <li> tags (bullet points)
      const liMatches = el.content.match(/<li[^>]*>/g);
      if (liMatches) {
        itemCount += liMatches.length;
      }
    }

    // Count other visual elements
    if (['image', 'chart', 'table', 'shape'].includes(el.type)) {
      itemCount++;
    }
  });

  return itemCount;
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
 * @param {string} slideId - Slide ID
 * @returns {string} Thumbnail filename
 */
function generateThumbnailPath(index, slideId) {
  return `slide_${String(index + 1).padStart(3, '0')}_${slideId}.png`;
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
    'Description',
    'Item Count',
    'Category',
    'Tags',
    'Thumbnail',
    'Slide JSON'
  ];

  const rows = [headers];

  slides.forEach((slide, index) => {
    const title = extractTitle(slide.elements);
    const description = extractDescription(slide.elements, 100);
    const itemCount = countItems(slide.elements);
    const category = detectSlideType(slide);
    const tags = getColorTheme(slide.background);
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
    console.error('  - Description: ~100 character summary');
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

    // Use assets directory directly for thumbnails (no extra subfolder)
    const fullImageDir = assetsDir;

    // Write per-slide JSON files and extract base64 cover images into assets directory
    const slideJsonPaths = [];
    const thumbnailPaths = [];
    data.slides.forEach((slide, index) => {
      const jsonFilename = generateSlideJsonFilename(index, slide.id);
      const jsonFilePath = path.join(assetsDir, jsonFilename);

      fs.writeFileSync(jsonFilePath, JSON.stringify(slide, null, 2), 'utf8');

      // Path stored in CSV should be relative to CSV file
      slideJsonPaths.push(path.join(assetsDirName, jsonFilename));

      // Try to extract a base64 image from slide elements as cover
      let thumbnailRelPath = '';
      const elements = Array.isArray(slide.elements) ? slide.elements : [];

      // Pick the largest base64 image (by area) as cover, if any
      let bestImage = null;
      let bestArea = 0;
      elements.forEach(el => {
        if (el && el.type === 'image' && typeof el.src === 'string' && el.src.startsWith('data:image/')) {
          const area = (el.width || 0) * (el.height || 0);
          if (area > bestArea) {
            bestArea = area;
            bestImage = el;
          }
        }
      });

      if (bestImage && bestImage.src) {
        const match = bestImage.src.match(/^data:image\/[a-zA-Z0-9+.+-]+;base64,(.+)$/);
        if (match && match[1]) {
          const base64Data = match[1];
          const pngFilename = generateThumbnailPath(index, slide.id);
          const pngPath = path.join(assetsDir, pngFilename);

          fs.writeFileSync(pngPath, Buffer.from(base64Data, 'base64'));
          thumbnailRelPath = path.join(assetsDirName, pngFilename);
        }
      }

      thumbnailPaths.push(thumbnailRelPath);
    });

    // Generate CSV
    console.log('Generating CSV...');
    const csv = generateCSV(data, assetsDirName, { slideJsonPaths, thumbnailPaths });

    // Write CSV file
    fs.writeFileSync(outputPath, csv, 'utf8');

    console.log('');
    console.log('✓ CSV file generated successfully!');
    console.log(`  Output: ${outputPath}`);
    console.log(`  Slides: ${data.slides.length}`);
    console.log(`  Assets directory: ${assetsDir}`);
    console.log(`  Images directory: ${fullImageDir}`);
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
  countItems,
  detectSlideType,
  getColorTheme,
  generateSlideJsonFilename,
};
