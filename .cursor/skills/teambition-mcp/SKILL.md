---
name: teambition-mcp
description: Interact with Teambition project management via MCP. Use when the user asks about Teambition projects, tasks, bugs, sprints, or wants to create/update/query tasks, defects, comments in Teambition.
---

# Teambition MCP 使用指南

## 服务器标识

MCP server: `user-teambition-mcp`

## 核心原则

**所有项目级 ID（projectId、sfcId、tfsId、cfId、选项 ID）在不同项目之间完全不同，禁止跨项目复用。**

### 禁止创建临时脚本/工具

**绝对禁止**通过编写 Python/Node.js/Shell 脚本来解析 MCP 返回的数据。所有数据获取和筛选**必须**通过 MCP 工具本身完成：
- 使用更精确的查询条件（TQL、pageSize、过滤参数）在源头减少数据量
- 如果返回数据被写入临时文件（大数据量场景），使用 Read 工具分段读取，**不要**写脚本解析
- 如果单次查询数据量过大，使用分页（`nextPageToken`）分批获取并逐批处理
- 合理利用 `pageSize` 控制返回量，必要时多次调用而非一次全拉

### 默认行为（每次对话必须执行）

收到用户关于 Teambition 的任何请求时，**第一步**必须读取当前项目目录下的 `teambition-context.md`，从中加载：

1. **组织 ID** —— 用于组织级查询
2. **当前用户 / 用户 ID** —— 所有操作默认以此用户身份执行
3. **项目 ID** —— 所有查询默认在此项目范围内

**默认假设**：除非用户明确指定了其他项目或其他用户，否则：
- 查询缺陷/任务 → 默认查询**当前项目**下的（**严禁跨项目查询**，必须限定在 `teambition-context.md` 中配置的项目范围内）
- 创建缺陷/任务 → 默认在**当前项目**下创建，执行者为**当前用户**
- 流转状态 → 默认使用**当前项目**的状态流

**一次性完整检索原则**：查询当前项目缺陷时，必须确保**一次性获取全部缺陷**，不得遗漏。具体要求：
- `pageSize` 设置为 **100**（接口最大值为 500，建议 100 起步）
- **必须检查** `nextPageToken`，如果非空则继续翻页，直到拉完全部数据
- 使用 TQL 精确过滤缺陷类型和状态：`sfcId = "缺陷sfcId" AND tfsId NOT IN ("已解决tfsId","已关闭tfsId","已拒绝tfsId","重复提交tfsId","转需求tfsId")`，其中所有 ID 均从 `teambition-context.md` 的状态流表获取
- **禁止**只拉默认 10 条就停止，**禁止**不检查分页就直接输出结果

如果 `teambition-context.md` 不存在或缺少关键信息，需要通过 API 动态获取并缓存。

### 缺陷处理原则

处理缺陷（Bug）时必须遵守以下规则：

- **缺陷只能是修复 BUG**：缺陷的本质是"代码行为与需求/设计不符"，修复缺陷意味着让代码恢复到预期行为
- **以下不属于缺陷范畴**：
  - 功能优化/体验改进 → 应该提为**需求**
  - 测试人员主观认为"应该这么改" → 需要先和产品确认是否是真正的 BUG
  - 产品优化类建议 → 应该提为**需求**
- **遇到疑似优化类缺陷时**：必须及时提醒用户确认——"这看起来更像是功能优化而非 BUG，建议和产品/测试确认后再决定是修复还是转为需求"
- **流转缺陷为"已拒绝"时**：如果缺陷实际是优化建议而非 BUG，可以拒绝并建议转为需求

## 项目上下文缓存机制

每个项目目录下应维护一个 `teambition-context.md` 文件，缓存该项目的关键 ID 映射，避免每次都重新查询。

### 缓存文件结构模板

```markdown
# Teambition 项目上下文

## 组织信息
- **组织 ID**: `xxx`
- **当前用户**: 姓名
- **用户 ID**: `xxx`

## 项目信息
- **项目名称**: xxx
- **项目 ID**: `xxx`
- **项目编号前缀**: xxx（如 MBPM）

## 任务类型（sfcId 映射）
| 类型名称 | sfcId |
|---------|-------|
| 需求 | xxx |
| 缺陷 | xxx |
| 任务 | xxx |

## 缺陷状态流（taskflowId: xxx）
| 状态 | tfsId | kind |
|------|-------|------|
| ... | ... | ... |

## 自定义字段（cfId 映射）
| 字段名 | cfId |
|--------|------|
| ... | ... |

## 常用字段选项
### 严重程度
| 选项 | id |
|------|-----|
| ... | ... |
```

### 何时需要刷新缓存

- `teambition-context.md` 不存在时
- 用户明确要求刷新时
- API 返回 ID 不匹配/无效时

## 操作流程

详细的分步操作指南请参阅 [reference.md](reference.md)，包括：
- 发现项目、获取任务类型（sfcId）、状态流、自定义字段
- 搜索任务/缺陷（TQL 语法、分页、字段说明）
- 创建任务（推荐 PostMcpTaskCreate + dryRun）
- 更新自定义字段、流转状态、添加评论

## 常用工具速查

| 工具 | 用途 |
|------|------|
| `QueryProjectsV3` | 搜索项目（支持 name 模糊、uniqueIdPrefix 精确） |
| `GetScenarioFieldsMCP` | 获取项目任务类型（sfcId） |
| `SearchTaskflowStatusesV3` | 获取工作流状态 |
| `SearchProjectCustomFiledsV3` | 获取自定义字段 |
| `SearchProjectTasksV3` | 搜索项目任务/缺陷（支持 TQL） |
| `SearchUserTasksV3` | 搜索当前用户个人任务（跨项目） |
| `PostMcpTaskCreate` | 智能创建任务（推荐，支持 dryRun） |
| `CreateTaskV3` | 传统创建任务 |
| `UpdateTaskCusomFieldV3` | 更新自定义字段（注意拼写：Cusom） |
| `UpdateTaskStatusV3` | 流转任务状态 |
| `CreateTaskCommentV3` | 添加评论 |
| `ListTaskActivitiesV3` | 查看动态/评论历史 |
| `UpdateTaskContentV3` / `NoteV3` / `ExecutorV3` / `PriorityV3` | 修改标题/描述/执行者/优先级 |
| `GetUsersMe` | 获取当前用户信息 |
| `PostV3MemberQuery` | 查询成员信息 |
| `ProjectTaskStatistics` | 项目任务统计 |

## 常见错误处理

| 错误码 | 含义 | 解决方案 |
|--------|------|---------|
| 10002 | 参数无效 | 检查参数名和值格式 |
| 10003 | 缺少必填项 | 先补充必填自定义字段再操作 |
| 10006 | 缺少必需参数 | 检查 API 必填参数 |
| 10020 | 状态不可达 | 按工作流顺序逐步流转，检查 rejectStatusIds |
| 10028 | TQL 表达式不支持 | 换用其他查询方式 |
| 10030 | TQL 字段名无效 | 使用有效的 TQL 字段（content、isDone、uniqueId、priority） |
| AuthBaseError | 权限不足 | 当前用户无此操作权限 |
