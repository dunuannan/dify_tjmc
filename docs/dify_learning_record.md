# Dify 学习记录

记录日期：2026-04-28

## 参考资料

- Dify 官方文档：https://docs.dify.ai/
- Workflow & Chatflow：https://docs.dify.ai/en/use-dify/build/workflow-chatflow
- Key Concepts / Dify DSL：https://docs.dify.ai/en/use-dify/getting-started/key-concepts
- Output 节点：https://docs.dify.ai/en/use-dify/nodes/output
- Tool 节点：https://docs.dify.ai/en/use-dify/nodes/tools
- Flow Logic：https://docs.dify.ai/en/use-dify/build/orchestrate-node
- Dify GitHub：https://github.com/langgenius/dify

## 平台定位

Dify 是一个开源 LLM 应用开发平台，核心能力包括 AI Workflow、RAG Pipeline、Agent、模型管理、可观测性和 API 化发布能力。GitHub README 将其定位为可从原型快速走向生产的 LLM 应用开发平台。

## DSL 文件

Dify 应用可以导出为 YAML 格式的 Dify DSL，也可以从 DSL 文件直接创建应用。这个项目中的 `.yml` 文件就是可移植、可导入的应用定义，适合用来版本化保存流程结构、节点配置、提示词、插件依赖和输入输出定义。

当前项目 DSL 版本均为：

- `kind: app`
- `version: 0.6.0`

## Workflow 与 Chatflow

- Workflow：一次性运行，从输入开始，按流程处理并返回结果。适合自动报告生成、数据处理、批量处理、审批审核等单轮任务。
- Chatflow：每轮对话触发一次流程，带聊天交互层；支持会话变量、LLM 节点记忆、流式 Answer 输出等。
- 两者都基于可视化画布和节点系统，通过连线组织模型、工具、知识检索、代码、分支等步骤。

本项目中：

- `demo.yml` 是 `advanced-chat`，属于聊天/知识库问答类应用。
- `donate_review.yml`、`donate_review_ocr.yml`、`purchase_approval_workflow.yml` 是 `workflow`，属于资料审核与报告生成类单次运行应用。

## 节点与变量要点

- Start/User Input 节点定义用户输入字段，包括文本、段落、选择、文件等。
- 下游节点通过变量引用上游节点输出，例如 `{{#node_id.text#}}` 或模板变量。
- 用户输入在一次运行开始时确定，节点输出可被后续节点引用。
- Environment Variables 适合保存 API Key 等敏感配置，避免 DSL 分享时泄露密钥。
- Conversation Variables 仅 Chatflow 使用，适合跨多轮对话持久保存状态。

## 输出节点

- Workflow 使用 Output/End 节点把结果返回给用户或 API 调用方。
- Output 节点的变量名会成为 API 响应 `outputs` 对象中的 key。
- 如果 Workflow 没有 Output 节点，流程可以运行成功，但不会向调用方返回数据。
- 一个 Workflow 可以有多个 Output 节点，但变量名需要保持唯一，避免后执行的同名变量覆盖前面的结果。

## 工具节点

Tool 节点用于把外部服务或插件能力接入工作流，例如 OCR、格式导出、搜索、数据库查询、内容处理等。本项目当前用到：

- MinerU 的 PDF 解析/OCR 工具，用于评估报告、法律意见书的 OCR 文本抽取。
- Markdown Exporter 工具，用于把审核报告导出为 Markdown 文件。

## 流程执行逻辑

- 串行连线：节点按顺序执行，后续节点可以读取前面已执行节点的变量。
- 并行连线：从同一节点发出的多个分支会并行执行；并行分支内部不能引用其他并行分支尚未完成的输出。
- 并行分支汇合后的下游节点可以读取各分支输出。
- Dify 文档说明单节点最多 10 个并行分支，嵌套并行最多 3 层。

## 后续修改 DSL 的建议

- 修改功能前先确认应用模式：`workflow` 使用 End/Output，`advanced-chat/chatflow` 使用 Answer。
- 修改文件输入时，同步检查 Start 节点变量、Document Extractor/Tool 的 `variable_selector`、模板变量和 LLM 提示词引用。
- 修改输出时，同步检查 End/Output 节点变量名，确保 API 调用方能拿到预期字段。
- 涉及长文档时，优先采用“抽取/摘要 -> 汇总审核 -> 最终报告”的分阶段结构，降低上下文过长导致的失败概率。
- 外部工具依赖需要检查插件是否已在目标 Dify 实例安装并配置凭据。
