# 当前 Dify DSL 流程分析

记录日期：2026-04-28

## 文件清单

| 文件 | 应用名 | 模式 | 节点数 | 连线数 | 主要用途 |
| --- | --- | --- | ---: | ---: | --- |
| `demo.yml` | 知识库 + 聊天机器人 | `advanced-chat` | 5 | 4 | 基于知识检索的聊天问答示例 |
| `donate_review.yml` | `donate_review` | `workflow` | 8 | 7 | 纯 Dify 文档抽取版企业捐赠资料审核 |
| `donate_review_ocr.yml` | `donate_review_ocr` | `workflow` | 17 | 17 | Dify + OCR 两阶段版企业捐赠资料审核，并导出 Markdown |
| `purchase_approval_workflow.yml` | `purchase_approval_review` | `workflow` | 13 | 14 | 采购用款审批资料 AI 审核，并导出 Markdown |

## 依赖概况

| 文件 | 插件/模型依赖 |
| --- | --- |
| `demo.yml` | `langgenius/openai_api_compatible:0.0.41` |
| `donate_review.yml` | `langgenius/openai_api_compatible:0.0.41` |
| `donate_review_ocr.yml` | `langgenius/deepseek:0.0.12`、`langgenius/mineru:0.5.2`、`bowenliang123/md_exporter:3.6.9` |
| `purchase_approval_workflow.yml` | `langgenius/deepseek:0.0.12`、`bowenliang123/md_exporter:3.6.9` |

## demo.yml

### 功能定位

知识库问答聊天机器人。用户输入问题后，流程先做知识库检索，再把检索结果交给 LLM，之后经过参数提取器，最终由 Answer 节点直接回复。

### 节点链路

`开始 -> 知识检索 -> LLM -> 参数提取器 -> 直接回复`

### 关键节点

- `start`：聊天开始节点，无自定义输入变量。
- `knowledge-retrieval`：知识检索，使用 `single` 检索模式。
- `llm`：模型为 `gemma-4-e4b-it`，提供问答生成。
- `parameter-extractor`：模型同为 `gemma-4-e4b-it`，用于从 LLM 结果中提取结构化参数。
- `answer`：向用户输出最终答复。

### 当前特点

- 文件上传功能配置存在，但 `enabled: false`。
- 知识检索依赖具体 Dify 知识库配置；迁移到其他实例时需要检查知识库绑定是否仍有效。
- 这是聊天型应用，不使用 Workflow 的 End/Output 节点。

## donate_review.yml

### 功能定位

企业捐赠资料审核工作流。用户上传捐赠协议、捐赠资产明细表、资产评估报告、法律意见书，并填写项目类型与补充说明；流程抽取四份文档文本，组装成审核包，交给 LLM 生成审核报告。

### Start 输入

- `package_name`：资料包名称或编号，可选，短文本。
- `project_type`：项目类型，必填，选择项。
- `agreement_file`：捐赠协议文件，必填。
- `asset_detail_file`：捐赠资产明细表文件，必填。
- `appraisal_report_file`：资产评估报告文件，必填。
- `legal_opinion_file`：法律意见书文件，必填。
- `reviewer_notes`：补充说明，可选，段落。

### 节点链路

`开始 -> 提取协议文本 -> 提取明细表文本 -> 提取评估报告文本 -> 提取法律意见书文本 -> 组装审核资料 -> 生成审核报告 -> 输出审核报告`

### 关键节点

- 4 个 `document-extractor`：分别抽取四份上传文件的 `text`。
- `review_package`：模板转换节点，把包名、项目类型、四份文档文本、补充说明组装为 LLM 输入。
- `review_llm`：模型为 `gemma-4-e4b-it`，生成最终审核报告。
- `review_output`：输出变量 `audit_report`，来自 `review_llm.text`。

### 当前特点

- 结构简单，所有文档抽取串行执行。
- 直接把四份全文拼接进最终 LLM，文档较长时可能受上下文长度影响。
- 法律意见书为必填，不支持缺失分支。

## donate_review_ocr.yml

### 功能定位

企业捐赠资料审核的 OCR 两阶段增强版。相比 `donate_review.yml`，它先对各资料生成短摘要，再基于摘要生成最终审核报告，并使用 MinerU OCR 解析评估报告和法律意见书，最后导出 Markdown 文件。

### Start 输入

- `package_name`：资料包名称或编号，可选。
- `project_type`：项目类型，必填。
- `agreement_file`：捐赠协议文件，必填。
- `asset_detail_file`：捐赠资产明细表文件，必填。
- `appraisal_report_file`：资产评估报告文件，必填，走 MinerU OCR。
- `legal_opinion_file`：法律意见书文件，可选，走 MinerU OCR。
- `reviewer_notes`：补充说明，可选。

### 节点链路

`开始 -> 提取协议文本 -> 提炼协议要点 -> 提取明细表文本 -> 提炼明细表要点 -> MinerU OCR 评估报告 -> 提炼评估报告要点 -> 判断是否上传法律意见书`

法律意见书存在：

`判断 -> MinerU OCR 法律意见书 -> 聚合法律意见书文本`

法律意见书缺失：

`判断 -> 法律意见书缺失说明 -> 聚合法律意见书文本`

汇合后：

`聚合 -> 提炼法律意见书要点 -> 组装审核资料 -> 生成审核报告 -> 生成导出文件名 -> 导出 Markdown 文件 -> 输出审核报告`

### 关键节点

- `agreement_summary`、`asset_detail_summary`、`appraisal_summary`、`legal_opinion_summary`：四个摘要 LLM，模型为 `deepseek-coder`。
- `appraisal_ocr`：MinerU `parse-file`，解析资产评估报告。
- `legal_opinion_check`：If-Else，判断 `legal_opinion_file` 是否 `not empty`。
- `legal_opinion_ocr`：MinerU `parse-file`，解析法律意见书。
- `legal_opinion_missing`：模板转换，生成“未提供法律意见书文件”的占位说明。
- `legal_opinion_aggregator`：聚合 OCR 文本或缺失说明。
- `review_package`：使用各文档摘要而非全文组装审核材料。
- `review_llm`：模型为 `deepseek-coder`，生成审核报告。
- `markdown_exporter`：Markdown 导出工具。
- `review_output`：输出 `audit_report` 与 `audit_report_md_file`。

### 当前特点

- 已解决长文档直接进入最终 LLM 的风险，采用“文档抽取/OCR -> 摘要 -> 汇总报告”的两阶段结构。
- 法律意见书可选，缺失时有显式分支与占位文本。
- 依赖 MinerU 和 Markdown Exporter，迁移时需要确认目标实例插件与授权可用。
- 输出同时包含文本报告和 Markdown 文件，适合后续下载、归档或接口集成。

## purchase_approval_workflow.yml

### 功能定位

采购用款审批资料 AI 审核工作流。用户上传项目需求书、调研报告、设备购置计划表，并填写项目名称、预算金额、补充说明；流程分别审核三份材料，再汇总生成最终审核报告。

### Start 输入

- `project_name`：项目名称，可选。
- `budget_amount`：预算金额，单位为万元，必填，当前为短文本。
- `project_req_file`：项目需求书文件，必填。
- `research_report_file`：调研报告文件，必填。
- `device_plan_file`：设备购置计划表文件，必填。
- `reviewer_notes`：补充说明，可选。

### 节点链路

开始节点并行分出三路：

- `开始 -> 提取设备购置计划表 -> 审核设备购置计划表`
- `开始 -> 提取项目需求书 -> 审核项目需求书`
- `开始 -> 提取调研报告 -> 审核调研报告`

三路审核结果汇合：

`三份材料审核结果 -> 汇总审核结果 -> 组装审核资料 -> 生成最终审核报告 -> 生成导出文件名 -> 导出 Markdown 文件 -> 输出审核报告`

### 关键节点

- 3 个 `document-extractor`：分别抽取三份上传文件文本。
- 3 个材料审核 LLM：分别审核设备购置计划表、项目需求书、调研报告，模型为 `deepseek-coder`。
- `review_summary`：汇总三份材料审核结果。
- `review_package`：模板转换，组装项目名称、预算金额（万元）、补充说明、三份材料审核摘要；其中包含预算金额大于等于 50 万元的重要提示逻辑。
- `final_review_llm`：生成最终审核报告。
- `export_filename_builder`：根据项目名称生成 Markdown 导出文件名；未填写项目名称时使用默认文件名。
- `markdown_exporter`：Markdown Exporter 工具，把 `final_review_llm.text` 导出为 Markdown 文件。
- `review_output`：输出变量 `audit_report`，来自 `final_review_llm.text`；输出变量 `audit_report_md_file`，来自 `markdown_exporter.files`。

### 当前特点

- 使用并行分支处理三份材料，效率比串行抽取/审核更好。
- 预算金额字段是 `text-input`，单位为万元，模板里使用 `budget_amount|float >= 50` 做阈值判断；如果输入非数字，可能影响预算判断，需要后续考虑改为 Number 或加格式校验。
- 文件上传提示推荐 PDF / DOCX / HTML / HTM；Start 节点文件字段允许 `.html/.htm/.doc/.docx/.pdf`。
- 审核报告会同时以文本和 Markdown 文件形式输出，便于下载、归档或接口集成。

## 后续修改基础结论

- 当前项目的主线业务有两类：企业捐赠资料审核、采购用款审批审核。
- `donate_review_ocr.yml` 是捐赠审核流程里更成熟的版本，具备 OCR、摘要降上下文、可选法律意见书、Markdown 导出。
- `donate_review.yml` 可作为纯 Dify 文档抽取的简化基线，但长文档稳定性弱于 OCR 两阶段版。
- `purchase_approval_workflow.yml` 已采用并行审核结构并具备 Markdown 导出能力，下一步最值得优化的是预算金额类型/校验、可选材料分支、报告格式标准化。
- 若后续要新增审核材料，必须同时更新 Start 输入、抽取/OCR 节点、摘要/审核 LLM、汇总模板、最终报告提示词和 Output 返回字段。
