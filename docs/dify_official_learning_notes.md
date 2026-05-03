# Dify 官方资料学习记录

记录日期：2026-05-03

资料来源：

- GitHub 仓库：https://github.com/langgenius/dify
- 官方文档：https://docs.dify.ai
- 文档索引：https://docs.dify.ai/llms.txt

## 平台定位

Dify 是开源 LLM / Agentic 应用开发平台，核心目标是把 AI 应用从原型推进到可发布、可观测、可集成的生产形态。官方仓库 README 将其能力概括为 AI Workflow、RAG Pipeline、Agent、模型管理、可观测性和后端 API 服务。

当前官方仓库仍是主要源码与部署入口，目录结构包含 `api`、`web`、`docker`、`sdks`、`docs`、`e2e`、`packages` 等。官方 README 推荐最快启动方式为 Docker Compose：

```bash
cd dify
cd docker
cp .env.example .env
docker compose up -d
```

启动后访问 `http://localhost/install` 完成初始化。

## 应用类型

官方文档推荐优先选择两类主要应用：

- Workflow：一次性运行，从输入开始，按节点流程处理并返回结果。适合自动报告生成、资料审核、数据处理、批处理、审批辅助等单轮任务。
- Chatflow：每轮对话触发一次流程，带聊天交互层。适合客服、问答助手、引导式咨询、带多轮上下文的交互应用。

Dify 也保留 Chatbot、Agent、Text Generator 等基础类型，但这些在底层同样依赖工作流引擎，只是界面更简单。

## Workflow 与 Chatflow 差异

- Workflow 可以由 User Input 或 Trigger 启动。User Input 启动的 Workflow 可以发布为 Web App、MCP Server、后端 API，也可以作为其他 Dify 应用中的工具。
- Chatflow 每次用户发言都会触发流程，不能用 Trigger 启动。
- Workflow 使用 Output / End 节点显式返回结果；没有输出节点时，作为 API 调用不会返回业务结果。
- Chatflow 使用 Answer 节点向用户输出内容，可以在流程中间流式返回。
- Chatflow 支持会话变量和 LLM 节点记忆，适合跨多轮保存状态；Workflow 的用户输入和节点输出在单次运行中流转。

## Dify DSL

所有 Dify 应用都可以导出为 YAML 格式的 Dify DSL，也可以从 DSL 文件直接创建应用。DSL 适合用于：

- 跨 Dify 实例迁移应用
- 与他人共享应用定义
- 把流程结构、节点配置、提示词、变量、插件依赖纳入版本管理
- 在本项目这类资料审核场景中沉淀可复用工作流模板

当前目录下的 `*.yml` 文件就是 Dify DSL。修改 DSL 时应同步检查应用模式、Start 输入、节点变量引用、插件依赖、LLM 模型配置、End / Answer 输出。

## 变量体系

Dify 的变量用于连接节点输入输出：

- User Input 自定义输入：用户在运行开始时填写，后续节点通过变量引用读取。
- 系统变量：如 `sys.user_id`、`sys.app_id`、`sys.workflow_id`、`sys.workflow_run_id`、`sys.timestamp`；Chatflow 还包含 `sys.conversation_id`、`sys.dialogue_count` 等会话相关变量。
- 节点输出变量：每个节点运行后产生输出，供后续节点引用。
- Environment Variables：用于保存 API Key 等敏感配置，避免 DSL 分享时泄露密钥。
- Conversation Variables：仅 Chatflow 使用，可在多轮对话中持久保存并更新。

变量可通过节点配置面板选择，也可在复杂文本/提示词中插入，例如 `{{#node_id.text#}}` 或 Jinja2 模板。

## 关键节点用法

### User Input

用于定义最终用户或 API 调用方需要提供的输入。支持短文本、段落、选择、数字、复选框、JSON、单文件、文件列表等类型。

注意：文件输入只负责收集文件，不会自动读取内容。文档类文件通常需要接 Document Extractor；图片可接具备视觉能力的 LLM 或图像处理工具；CSV / JSON 可用 Code 节点解析。

### LLM

用于调用已配置模型进行生成、分析、摘要、结构化输出等。使用前必须在系统设置中配置模型供应商。LLM 节点支持：

- Prompt 配置
- 上下文变量 / RAG 检索结果注入
- 结构化输出
- Chatflow 记忆
- 多模态文件处理
- Jinja2 模板
- 流式输出
- 重试与错误处理

### Tool

Tool 节点用于把外部服务/API/插件能力接入流程，如搜索、数据库、OCR、文件导出、内容处理等。工具可能需要凭证，应在 Tools 或 Plugins 中配置。

本项目涉及的典型工具包括 MinerU OCR 和 Markdown Exporter。

### Code

用于执行 Python 或 JavaScript 做复杂数据转换、计算、校验和逻辑处理。代码在沙箱中运行，有输出大小、数值范围、对象深度等限制；自部署时需要确保 sandbox 服务正常。

### Variable Aggregator

用于汇聚互斥分支输出，例如 If/Else 中只有一条分支执行时，把不同分支的同类型变量收敛成一个下游变量。它不适合合并并行分支结果；并行结果应使用 Code 或 Template 节点合并。

### Output / End

用于 Workflow 显式定义返回给用户或 API 的输出字段。至少要配置一个输出变量，否则不会返回业务数据。输出变量名会成为 API 响应 `outputs` 对象中的 key。

### Human Input

用于在流程关键位置暂停，向人工请求输入、复核或决策，再根据人工动作继续执行。适合高风险审批、合规审核和需要人工兜底的流程。

## 调试与发布

调试方式：

- 单节点测试：选中节点后单独运行，检查输入、输出、耗时和错误。
- Step-by-step：逐步执行流程，并在 Variable Inspector 中查看和修改缓存变量。
- Run History：查看完整运行记录，包括结果、输入输出明细、节点执行顺序、耗时和数据流。

发布/API：

- 应用构建完成后，在 API Access 中生成 API Key。
- API Key 必须放在服务端，不能暴露在前端。
- Workflow 需先发布才能通过 `/workflows/run` 执行。
- Blocking 模式响应中会返回 `task_id`、`workflow_run_id`、`data.status`、`data.outputs`、错误信息、耗时、token 数和步骤数。

## 当前项目说明

本项目不是完整 Dify 源码，而是 Dify DSL 工作流集合。各 DSL 的应用定位、节点链路、依赖和后续优化建议统一维护在 `docs/current_dsl_analysis.md`，避免在多份文档中重复记录。

## 后续实践原则

- 资料审核、审批、报告生成优先使用 Workflow。
- 互动问答、客服、知识库助手优先使用 Chatflow。
- 长文档先做提取/OCR，再做摘要，最后汇总生成报告，避免直接把全文塞进最终 LLM。
- 对可选材料使用 If/Else + Variable Aggregator，保证下游节点只处理一个统一变量。
- 对并行材料审核使用多分支并行，再通过 Template 或 Code 汇总。
- 涉及金额、数量、日期等字段时优先使用 Number / JSON 等结构化输入，减少文本转数字的不确定性。
- 发布给外部系统前必须确认 Output 字段名稳定，例如 `audit_report`、`audit_report_md_file`。
- 迁移 DSL 前先核对插件、模型供应商、凭证、知识库绑定和环境变量。
