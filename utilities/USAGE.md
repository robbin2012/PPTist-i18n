## 使用流程（PPTist JSON → Drupal 模板）

0. **在 PPTist 中标记模板结构**  
   - 在编辑器中明确标记各类文本：  
     - 主标题：`Title`（textType: `title`）  
     - 副标题 / 关键说明：`Subtitle` 或普通正文  
     - 列表项标题：`List Item Title`（textType: `itemTitle`，用于统计 Item Count）  
   - 如需对模板增加额外说明或使用规则，请使用 `Notes` 文本（textType: `notes`）：  
     - Notes 不直接放在画布可见区域，可放在单独角落；  
     - 用于写模板用途、适用场景、主题风格、生成规则等（后续会进入 CSV 的 `Notes` 列供 AI 使用）。

1. **从 PPTist 导出 JSON，并规范化 Title / List Item 文本，然后提取 CSV 元数据**  
   - 在 PPTist 中导出当前演示文稿的 JSON，并保存到本仓库的 `utilities/test` 目录，例如：`utilities/test/pptist-01.2.json`。  
   - （推荐）使用 `pptist-normalize-text.cjs` 先统一 Title / List Item 的 HTML 结构和列表字体，并将 `shape.text.type === "itemTitle"` 的标题提升为独立文本元素，方便后续维护：  
     ```bash
     # 原地覆盖导出的 JSON
     node utilities/pptist-normalize-text.cjs utilities/test/pptist-01.2.json

     # 或者输出到新的 JSON 文件
     node utilities/pptist-normalize-text.cjs utilities/test/pptist-01.2.json utilities/test/pptist-01.2.normalized.json
     ```  
     - 该脚本会做三件事：  
       - List Item（`textType: "item"`）：  
         - 把拆成很多 span / 多层嵌套 span 的占位文本合并成一个 `<span style="...">`；  
         - 只把列表项字体统一为 `Roboto Light`，不修改原来的字号和颜色；  
       - Title（`textType: "itemTitle"`，包括 `text` 元素和 `shape.text`）：  
         - 仅合并 span 结构，不修改字体 / 字号 / 颜色；  
       - 对 `shape.text.type === "itemTitle"` 的元素：  
         - 会新增一个 `type: "text", textType: "itemTitle"` 的文本元素（id 形如 `shapeId_title`），  
         - 复制原来 shape 的 `left/top/width/height/rotate`，  
         - 并从原 shape 中移除 `text` 字段，后续模板就可以只依赖 text 元素按 `textType` 做映射。  
   - 使用 `pptist-extract-csv.cjs` 从（规范化后的）PPTist JSON 中提取每页模板信息，生成 CSV 和对应的单页 JSON：  
     ```bash
     node utilities/pptist-extract-csv.cjs input.json utilities/test/pptist-01.2.csv
     ```

2. **补充 / 生成英文 Body 与分类**  
   - 使用 AI（或 `pptist-generate-intro.cjs`）按行生成英文简介，写入 CSV 的 `Body` 列。推荐英文提示词示例：  
     > Based on the slide Title, Notes and the corresponding PNG thumbnail, write an English description of about 2 paragraphs and ~200 words. Focus on what kind of infographic template this is, what content or scenarios it is best for, and how the layout is structured. Do not add meta commentary or transitions like “In summary” or “Overall”. Output in Markdown format (with paragraphs separated by blank lines).  
   - 将 `Category` 列设置为 Drupal 中已存在的术语名称，例如：  
     - `Information`（对应 `infograph_template_category` 里 tid=52）

3. **上传到 Drupal（含封面）**  
   在本仓库根目录运行上传脚本，它会：为每一行创建 file / media / node，并将封面挂到 `cover` 字段：  
   ```bash
   DRUPAL_BASE_URL="https://your-site" \
   DRUPAL_USER="admin" \
   DRUPAL_PASS="password" \
   node utilities/post-csv-to-drupal.cjs \
     utilities/test/pptist-01.2.csv \
     --image-dir utilities/test/pptist-01.2_assets
   ```
