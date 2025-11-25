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
| **Description** | 内容摘要（约100字） | "本项目旨在..." |
| **Item Count** | 内容项数量 | 5 |
| **Category** | 幻灯片类型 | Cover, Content, Chart, Table |
| **Tags** | 色彩主题标签 | Light, Dark, Warm, Cool, Fresh |
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
| `--content-type <type>` | 内容类型机器名 | `pptist_slide` |
| `--image-dir <dir>` | 缩略图目录路径 | CSV 同级 `images` 目录 |
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

在 Drupal 中创建名为 `pptist_slide`（或自定义名称）的内容类型，包含以下字段：

| 字段机器名 | 字段类型 | 说明 |
|------------|----------|------|
| `title` | 文本 | 标题（Drupal 自带） |
| `field_description` | 长文本 | 描述 |
| `field_item_count` | 整数 | 内容项数量 |
| `field_category` | 文本 | 分类 |
| `field_tags` | 文本 | 标签 |
| `field_thumbnail` | 媒体引用 (Image) | 缩略图 |

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
│  │ 3. 创建 node--pptist_slide          ││
│  │    (关联 media 作为 field_thumbnail)││
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

```json
POST /jsonapi/node/pptist_slide
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "node--pptist_slide",
    "attributes": {
      "title": "项目介绍",
      "field_description": "本幻灯片介绍了...",
      "field_item_count": 5,
      "field_category": "Cover",
      "field_tags": "Dark"
    },
    "relationships": {
      "field_thumbnail": {
        "data": { "type": "media--image", "id": "{media-uuid}" }
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

## 其他工具

未来可能添加的工具：

- `pptist-thumbnail-generator.cjs` - 批量生成缩略图
- `pptist-validate.cjs` - 验证 PPTist 文件格式
- `pptist-merge.cjs` - 合并多个演示文稿
