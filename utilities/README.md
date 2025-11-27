# PPTist Utilities

工具集用于处理 PPTist 文件和数据导出。

## pptist-extract-csv.cjs

从 PPTist JSON 文件中提取幻灯片信息并生成 CSV 文件，用于导入到 Drupal 或其他内容管理系统。

> **注意**：使用 `.cjs` 扩展名以兼容项目的 ES Module 配置。

### 功能特性

- ✅ 提取幻灯片标题
- ✅ 生成内容摘要（约100字）
- ✅ 统计内容项数量（列表项、图表、表格等）
- ✅ 自动分类幻灯片类型
- ✅ 识别色彩主题标签
- ✅ 生成缩略图文件路径引用

### 使用方法

```bash
node utilities/pptist-extract-csv.cjs <input.json> [output.csv] [image-dir]
```

#### 参数说明

- `<input.json>` - **(必需)** PPTist JSON 格式文件路径
- `[output.csv]` - **(可选)** 输出 CSV 文件路径，默认: `output/slides.csv`
- `[image-dir]` - **(可选)** 缩略图目录名称，默认: `images`

#### 示例

```bash
# 基本用法
node utilities/pptist-extract-csv.cjs presentation.json

# 指定输出文件
node utilities/pptist-extract-csv.cjs presentation.json output/my-slides.csv

# 指定输出文件和图片目录
node utilities/pptist-extract-csv.cjs presentation.json output/slides.csv thumbnails
```

### 输出格式

生成的 CSV 文件包含以下列：

| 列名 | 说明 | 示例 |
|------|------|------|
| **Title** | 幻灯片标题 | "项目介绍" |
| **Body** | 内容摘要 / 正文（初始为约100字摘要，可后续替换为 AI 生成的 markdown 文本） | "本项目旨在..." |
| **Item Count** | 内容项数量 | 5 |
| **Category** | 幻灯片类型 | Cover, Content, Chart, Table |
| **Tags** | 主题 / 风格标签（优先从 Notes 中的“主题”或“主题风格”提取） | "浅绿橙清淡风" |
| **Notes** | 模板备注 / 生成规则说明（来自 `textType: "notes"` 或 `remark`） | "规则：List Item Title 不能超过 40 个字母长度..." |
| **Thumbnail** | 缩略图文件路径 | output_assets/slide_001_abc123.png（如有自动提取） |
| **Slide JSON** | 当前幻灯片 JSON 文件的相对路径 | output_assets/slide_001_abc123.json |

> 说明：其中 `output_assets` 为当前 CSV 文件（不含扩展名）对应的资源目录，例如：
> - CSV：`output/slides.csv`
> - 资源目录：`output/slides_assets/`
> - 示例路径：`slides_assets/slide_001_xxx.png`，`slides_assets/slide_001_xxx.json`

### 幻灯片分类

工具会自动识别以下幻灯片类型：

- **Cover** - 封面页
- **Table of Contents** - 目录页
- **Transition** - 过渡页
- **Content** - 普通内容页
- **End** - 结束页
- **Chart** - 包含图表
- **Table** - 包含表格
- **Image with Title** - 图片+标题
- **Diagram** - 包含图形/形状
- **Title and Content** - 标题+内容
- **Blank** - 空白页

### 色彩主题标签

根据背景色自动生成：

- **Light** - 浅色系
- **Dark** - 深色系
- **Warm** - 暖色系（红、橙）
- **Cool** - 冷色系（蓝、绿）
- **Fresh** - 清新色系（绿色调）
- **Red** - 红色系
- **Blue** - 蓝色系
- **Neutral** - 中性色
- **Gradient** - 渐变背景
- **Image Background** - 图片背景
- **Default** - 默认

### 工作流程

1. **准备 JSON 文件**

   从 PPTist 编辑器导出 JSON 格式文件：
   - 打开 PPTist
   - 点击"文件" → "导出" → "导出 JSON"

2. **运行工具**

   ```bash
   node utilities/pptist-extract-csv.cjs your-presentation.json
   ```

3. **生成缩略图**

   对于部分由 PPTist 导出的 JSON，元素里会自带 `data:image/...;base64,...` 的图片数据（例如从 PPTX 导入的模板封面），工具会自动：
   - 从每页中选择面积最大的 base64 图片
   - 解码并输出为 `当前 CSV 名_assets/slide_XXX_<id>.png`
   - 在 CSV 的 `Thumbnail` 列里写入对应路径

   如果某一页没有可用的 base64 图片，对应行的 `Thumbnail` 会为空，这种情况下你仍然可以在 PPTist 界面手动：
   - 点击"文件" → "导出" → "导出图片"
   - 选择 PNG 格式
   - 保存或拷贝到 `输出 CSV 同名 _assets/` 目录（例如：`output/slides_assets/`）
   - 并将文件名改为 CSV 中 `Thumbnail` 列约定的名称（例如：`slide_001_xxx.png`）

4. **每页 Slide JSON**

   工具会自动在 `当前 CSV 文件名_assets` 目录下，为每一页生成一个独立的 JSON 文件，例如：

   - `slides_assets/slide_001_xxx.json`
   - `slides_assets/slide_002_xxx.json`

4. **导入 Drupal**

   使用 Drupal 的 CSV 导入模块导入生成的 CSV 文件。

### 开发与扩展

如果需要自定义提取逻辑，可以修改以下函数：

```javascript
// 修改标题提取逻辑
function extractTitle(elements) { ... }

// 修改描述生成逻辑
function extractDescription(elements, maxLength) { ... }

// 修改分类逻辑
function detectSlideType(slide) { ... }

// 修改标签生成逻辑
function getColorTheme(background) { ... }
```

### 故障排除

#### 问题：ES Module 错误

```
ReferenceError: require is not defined in ES module scope
```

**解决方案**：确保使用 `.cjs` 扩展名的文件（`pptist-extract-csv.cjs`），而不是 `.js`。

#### 问题：找不到输入文件

```
Error: Input file not found: presentation.json
```

**解决方案**：确认文件路径正确，使用绝对路径或相对于当前目录的路径。

#### 问题：JSON 解析错误

```
Error processing file: Unexpected token...
```

**解决方案**：确认 JSON 文件格式正确，使用 JSON 验证工具检查文件。

#### 问题：缺少幻灯片信息

某些幻灯片的标题或描述为空。

**解决方案**：这是正常的，工具会自动处理：
- 无标题时使用 "Untitled Slide"
- 无内容时描述为空
- 确保原始 PPT 中有足够的文本内容

### 依赖项

本工具仅使用 Node.js 内置模块，无需安装额外依赖：

- `fs` - 文件系统操作
- `path` - 路径处理

### 许可证

与 PPTist 项目保持一致。

---

## 测试示例

项目包含一个测试示例：

```bash
# 运行测试示例
node utilities/pptist-extract-csv.cjs utilities/test/sample.json utilities/test/output.csv

# 查看生成的 CSV
cat utilities/test/output.csv
```

测试文件：
- `utilities/test/sample.json` - 示例 PPTist JSON 文件（5张幻灯片）
- `utilities/test/output.csv` - 生成的 CSV 文件

---

## post-csv-to-drupal.cjs

将 CSV 数据（由 `pptist-extract-csv.cjs` 生成）上传到 Drupal CMS，通过 JSON:API 接口创建内容节点并上传缩略图。

### 功能特性

- ✅ 读取 CSV 文件并解析幻灯片数据
- ✅ 通过 Drupal JSON:API 创建内容节点
- ✅ 自动上传缩略图图片到 Drupal Media
- ✅ 支持用户认证（用户名/密码）
- ✅ 支持 CSRF Token 保护
- ✅ 干运行模式预览上传内容
- ✅ 详细的进度和错误日志

### 使用方法

```bash
node utilities/post-csv-to-drupal.cjs <input.csv> [options]
```

#### 参数选项

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--base-url <url>` | Drupal 站点 URL | 环境变量 `DRUPAL_BASE_URL` |
| `--username <user>` | Drupal 用户名 | 环境变量 `DRUPAL_USER` |
| `--password <pass>` | Drupal 密码 | 环境变量 `DRUPAL_PASS` |
| `--content-type <type>` | 内容类型机器名（例如 `infographic_template`） | `infographic_template` |
| `--image-dir <dir>` | 缩略图目录路径 | 自动从 CSV 同级及 `*_assets` 目录中探测 |
| `--dry-run` | 预览模式，不实际上传 | - |
| `--skip-images` | 跳过图片上传 | - |

#### 环境变量

```bash
export DRUPAL_BASE_URL="https://your-drupal-site.com"
export DRUPAL_USER="admin"
export DRUPAL_PASS="your-password"
```

#### 示例

```bash
# 基本用法（使用环境变量）
node utilities/post-csv-to-drupal.cjs output/slides.csv

# 指定 Drupal URL 和认证
node utilities/post-csv-to-drupal.cjs output/slides.csv \
  --base-url https://cms.example.com \
  --username admin \
  --password secret123

# 干运行模式预览
node utilities/post-csv-to-drupal.cjs output/slides.csv --dry-run

# 跳过图片上传
node utilities/post-csv-to-drupal.cjs output/slides.csv --skip-images

# 自定义内容类型
node utilities/post-csv-to-drupal.cjs output/slides.csv --content-type slide_template
```

### Drupal 配置要求

#### 1. 创建内容类型

在 Drupal 中创建名为 `infographic_template`（或与脚本中 `--content-type` 一致）的内容类型，包含以下字段：

| 字段机器名 | 字段类型 | 说明 |
|------------|----------|------|
| `title` | 文本 | 标题（Drupal 自带） |
| `body` | 长文本（含摘要） | 描述（映射 CSV 的 `Body` 列） |
| `items_number` | 整数 | 内容项数量（映射 CSV 的 `Item Count` 列） |
| `prompt` | 长文本 | 备注 / Prompt（映射 CSV 的 `Notes` 列） |
| `unique_key` | 文本 | 模板唯一标识（映射 CSV 的 `Unique Key` 或 `Slide JSON` 路径） |
| `category` | 术语引用 (Vocabulary: `infograph_template_category`) | 分类 |
| `tags` | 术语引用 (Vocabulary: `infograph_template_tags`) | 标签（脚本会按名称自动创建缺失标签） |
| `cover` | 媒体引用 (Image) | 缩略图 / 封面 |
| `template_file` | 文件 (File) | 模板 JSON 文件（可选，对应 CSV 的 `Slide JSON` 路径） |

同时需要在 Drupal 中准备两类术语词汇表（Vocabulary）：

- `infograph_template_category`：信息图分类（用于 `category` 字段）；
- `infograph_template_tags`：信息图标签（用于 `tags` 字段）。

#### 2. 启用 JSON:API

确保已启用以下 Drupal 模块：

- JSON:API
- JSON:API Resource
- Serialization

#### 3. 配置权限

确保 API 用户具有以下权限：

- 创建指定内容类型的内容
- 创建媒体
- 上传文件

### 工作流程

```
┌─────────────────┐
│  CSV 文件       │
│  (slides.csv)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  读取 CSV       │────►│  登录 Drupal    │
│  解析数据       │     │  获取 CSRF Token│
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│  遍历每条记录                            │
│  ┌─────────────────────────────────────┐│
│  │ 1. 上传缩略图到 file--file          ││
│  │ 2. 创建 media--image                ││
│  │ 3. 创建 node--infographic_template  ││
│  │    (关联 media 作为 cover 字段)     ││
│  └─────────────────────────────────────┘│
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  输出上传结果   │
│  统计成功/失败  │
└─────────────────┘
```

### JSON:API 请求示例

#### 上传图片文件

```http
POST /jsonapi/media/image/field_media_image
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="slide_001.png"
X-CSRF-Token: {token}

<binary image data>
```

#### 创建 Media

```json
POST /jsonapi/media/image
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "media--image",
    "attributes": { "name": "Slide 001" },
    "relationships": {
      "field_media_image": {
        "data": { "id": "{file-uuid}", "type": "file--file" }
      }
    }
  }
}
```

#### 创建内容节点

```http
POST /jsonapi/node/infographic_template
Content-Type: application/vnd.api+json
X-CSRF-Token: {token}
```

```json
{
  "data": {
    "type": "node--infographic_template",
    "attributes": {
      "title": "项目介绍",
      "body": {
        "value": "本幻灯片介绍了...",
        "summary": "本幻灯片介绍了...",
        "format": "basic_html"
      },
      "items_number": 5,
      "prompt": "这里是 Notes / Prompt 内容",
      "unique_key": "pptist-01.2_assets/slide_001__O8iEg4w4c.json"
    },
    "relationships": {
      "category": {
        "data": [
          {
            "type": "taxonomy_term--infograph_template_category",
            "id": "{category-term-id}"
          }
        ]
      },
      "tags": {
        "data": [
          {
            "type": "taxonomy_term--infograph_template_tags",
            "id": "{tag-term-id-1}"
          }
        ]
      },
      "cover": {
        "data": { "type": "media--image", "id": "{media-uuid}" }
      },
      "template_file": {
        "data": { "type": "file--file", "id": "{template-file-uuid}" }
      }
    }
  }
}
```

### 故障排除

#### 问题：401 Unauthorized

```
✗ Login failed: ...
```

**解决方案**：
- 确认用户名和密码正确
- 确认用户有创建内容的权限
- 检查 Drupal 是否允许 JSON:API 认证

#### 问题：403 Forbidden

```
✗ Node creation failed: Access denied
```

**解决方案**：
- 检查用户权限配置
- 确认内容类型存在且用户可创建
- 检查 CSRF Token 是否有效

#### 问题：图片上传失败

```
⚠️ Image not found: ...
```

**解决方案**：
- 确认缩略图目录路径正确
- 检查图片文件是否存在
- 使用 `--image-dir` 指定正确的目录

#### 问题：字段不存在错误

```
✗ Node creation failed: field_xxx does not exist
```

**解决方案**：
- 在 Drupal 中创建对应的字段
- 或修改工具代码中的字段映射

### 自定义字段映射

如需修改 CSV 列到 Drupal 字段的映射，编辑 `createNode` 方法：

```javascript
// 在 DrupalClient.createNode 方法中
const attributes = {
  title: slideData.title || 'Untitled Slide',
};

// 添加或修改字段映射
if (slideData.description) {
  attributes.field_description = slideData.description;  // 修改字段名
}
if (slideData.custom_field) {
  attributes.field_custom = slideData.custom_field;  // 添加自定义字段
}
```

---

## 完整工作流程示例

```bash
# 1. 导出 PPTist JSON
# （在 PPTist 界面操作导出）

# 2. 提取 CSV 数据
node utilities/pptist-extract-csv.cjs presentation.json output/slides.csv

# 3. 导出缩略图图片到 output/images/ 目录
# （在 PPTist 界面操作导出图片）

# 4. 预览上传内容
node utilities/post-csv-to-drupal.cjs output/slides.csv --dry-run

# 5. 正式上传到 Drupal
node utilities/post-csv-to-drupal.cjs output/slides.csv \
  --base-url https://your-drupal-site.com \
  --username admin \
  --password your-password
```

---

## pptist-generate-intro.cjs

根据模板 CSV 中的标题 / 注释 / 分类 / 标签等信息，自动生成约 150 字的中文简介，写回到 `Body` 列。

### 用途

- 针对每个模板（通常是一页 slide.json + 封面 + 对应 CSV 一行）生成一个更偏“商品介绍/模板说明”的简介文案；
- 适用于在模板市场 / CMS 中展示模板详情时使用。

### 使用方法

```bash
node utilities/pptist-generate-intro.cjs <input.csv> [output.csv]
```

- `<input.csv>` **(必填)**：模板的元数据 CSV 文件（需包含 Title 和 Body 列）；
- `[output.csv]` **(可选)**：输出 CSV 文件，默认覆盖输入文件。

### 处理逻辑

- 解析表头（不区分大小写），需要至少包含：
  - `Title`
  - `Body`
- 若存在则一并利用的列：
  - `Category`
  - `Notes`
  - `Tags`
  - `Thumbnail`
- 每一行会生成一段简介，写入到 `Body` 列，长度目标约为 150 字（上限约 170 字）；
- 简介会综合使用：
  - `Title`：生成 `《标题》是一页 XXX 模板` 的开头；
  - `Notes` 中的 `适用场景` / `颜色` 片段；
  - `Category`：映射为中文描述（封面页/内容页/图表页等）；
  - `Tags` / 颜色信息：用于生成风格描述（清新明快、沉稳大气等）；
  - `Thumbnail` 是否存在：决定是描述为“封面设计简洁大方，图文布局突出核心信息”还是更通用的结构说明。

生成后可以配合 `post-csv-to-drupal.cjs` 等工具，一并导入到 Drupal 或其他 CMS 中使用。

---

## 其他工具

未来可能添加的工具：

- `pptist-thumbnail-generator.cjs` - 批量生成缩略图
- `pptist-validate.cjs` - 验证 PPTist 文件格式
- `pptist-merge.cjs` - 合并多个演示文稿
