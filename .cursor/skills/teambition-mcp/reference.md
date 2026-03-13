# Teambition MCP 详细操作流程

## 第一步：发现项目

```
工具: QueryProjectsV3
参数: { "name": "关键词", "pageSize": 20 }
```

通过关键词模糊搜索定位目标项目，获取 `projectId`。也可以用 `uniqueIdPrefix` 按项目编号前缀搜索。

**注意**：不要用 `SearchProjectsTQL`，它的 TQL 不支持 `contains` 语法。

## 第二步：获取项目任务类型（sfcId）

**正确方式**——使用专用 API 直接获取：

```
工具: GetScenarioFieldsMCP
参数: { "projectId": "xxx" }
```

返回项目所有任务类型（需求、缺陷、任务等）及其 `sfcId`。可用 `sources: "application.bug"` 筛选缺陷类型。

**备选方式**——也可以用 `GetScenarioFieldsV3`，参数相同。

将获取到的 sfcId 映射写入 `teambition-context.md` 缓存。

## 第三步：获取状态流信息

```
工具: SearchTaskflowsV3
参数: { "projectId": "xxx" }
```

获取项目所有工作流，通过 `taskflowId` 区分不同任务类型的工作流。

```
工具: SearchTaskflowStatusesV3
参数: { "projectId": "xxx", "tfIds": "目标工作流ID" }
```

获取指定工作流的所有状态。关键字段：
- `kind`：`start`（起始）、`unset`（中间）、`end`（终止）
- `rejectStatusIds`：标识从该状态可以流转到哪些状态

**状态流转有严格顺序限制**，不能跳跃。必须根据 `rejectStatusIds` 判断可达状态。

可选使用 `SearchTaskflowNodes` 获取更详细的工作流节点和流转关系。

将状态流信息写入 `teambition-context.md` 缓存。

## 第四步：获取自定义字段

```
工具: SearchProjectCustomFiledsV3
参数: { "projectId": "xxx", "subtype": "bug", "scope": "all" }
```

获取缺陷类型的所有自定义字段及其选项。将必填字段的 `cfId` 和选项 ID 写入缓存。

也可以用 `SearchOrgCustomfiledV3` 获取组织级别的自定义字段。

## 第五步：搜索项目任务/缺陷

```
工具: SearchProjectTasksV3
参数: { "projectId": "xxx", "q": "isDone = false", "pageSize": 50 }
```

**TQL 有效字段**：`content`、`isDone`、`uniqueId`、`priority` 等。
**TQL 无效字段**：`taskflowName`、`sfcName`（会报 invalid field name）。

搜索示例：
```
q: "content ~ \"bug\" OR content ~ \"缺陷\""
q: "uniqueId = 520"
q: "isDone = false"
```

TQL 不支持按 `sfcName` 筛选，只能拉取全部未完成任务后在结果中按 `sfcId` 过滤缺陷。

**分页陷阱**：默认 pageSize=10，大项目任务很多，务必设置较大的 pageSize 或翻页（用 `nextPageToken`），否则会漏掉大量数据。

**返回字段说明**：`SearchProjectTasksV3` 一次调用返回任务的大部分信息：
- `content`（标题）、`note`（备注/描述，markdown 格式）、`priority`、`isDone`
- `executorId`、`creatorId`、`created`、`updated`
- `tfsId`（当前状态 ID，需对照状态流表翻译）、`sfcId`（任务类型 ID）
- `customfields` 数组（自定义字段的当前值，内联返回，无需额外查询）

**获取评论**：MCP 没有"列出评论"的专用工具，通过 `ListTaskActivitiesV3` 过滤 `actions: "comment"` 获取。

**图片限制**：备注中的图片只返回 `[图片]` 占位符。Teambition 的 note 实际以 rtf（富文本）格式存储，原始格式中图片以 `![image](url)` 或 `<img src="tcs.teambition.net/...">` 形式存在，但 MCP 返回时将图片替换为 `[图片]` 占位符。当前 MCP 的已知限制：
- 没有"获取任务附件列表"的工具（Teambition API 本身有 `attachments` 字段，但 MCP 未返回）
- 没有"下载附件/图片"的工具（`CreateUploadTokenV3` 仅支持上传）
- `GetTaskLinksV3` 可以获取 `work` 类型的关联附件，但内嵌在 note 中的图片不在此列
- 如需查看图片，引导用户到 Teambition 网页端查看，或建议扩展 MCP Server 添加获取附件的工具

## 第六步：搜索当前用户的个人任务

```
工具: SearchUserTasksV3
参数: { "roleTypes": "executor", "pageSize": "50" }
```

自动使用当前认证用户，无需传 userId。返回**跨项目**的所有被分配任务。从结果中：
1. 通过 `sfcId` 过滤缺陷类型
2. 通过 `isDone` 过滤未完成
3. 通过 `projectId` 分组归类
4. 通过 `executorId` 确认当前用户 ID

## 第七步：查询具体任务

```
工具: SearchProjectTasksV3
参数: { "projectId": "xxx", "q": "uniqueId = 520", "pageSize": 1 }
```

通过 `uniqueId`（即任务编号，如 MBPM-520 中的 520）精确定位单个任务。

也可以用 `QueryTaskV3` 通过 taskId 直接查询。

## 第七步 B：查询任务关联内容（需求溯源）

查看缺陷时**必须**同步查询关联内容：

```
工具: GetTaskLinksV3
参数: { "taskId": "缺陷的taskId" }
```

返回结构包含多种关联类型：
- `linkedType: "task"` → 关联的任务/需求（**重点关注**）
- `linkedType: "post"` → 关联的文档
- `linkedType: "work"` → 关联的附件
- `linkedType: "testcase"` → 关联的测试用例
- 还可能有外部链接（网页、钉钉文档等）

**需求溯源流程**：
1. 从返回结果中筛选 `linkedType: "task"` 的条目
2. 取出 `linkedId`（关联任务的 taskId）
3. 用 `QueryTaskV3` 查询每个关联任务的详情
4. 通过 `sfcId` 对照 `teambition-context.md` 判断是否为需求类型
5. 阅读需求的 `content`（标题）和 `note`（描述），理解预期行为
6. 将缺陷现象与需求预期行为对比，输出分析结论

**示例调用链**：
```
① GetTaskLinksV3 { "taskId": "bug-task-id" }
   → 发现 linkedType:"task", linkedId:"req-task-id"

② QueryTaskV3 { "taskId": "req-task-id" }
   → 获取需求标题、描述、验收标准

③ 对比分析：缺陷描述 vs 需求定义 → 输出结论
```

## 第八步：创建任务（推荐方式）

**推荐**——使用智能创建接口：

先查询字段配置：
```
工具: GetMcpTaskPrecreate 或 GetMcpApiTaskPrecreate
参数: { "requestBody": { "projectId": "xxx" } }
```

返回所有 sfc 类型和每个类型支持的字段（包括 fieldKey、默认值、是否必填）。

再创建任务（先 dryRun 验证）：
```
工具: PostMcpTaskCreate
参数: {
  "requestBody": {
    "projectId": "项目ID",
    "dryRun": true,
    "tasks": [{
      "data": [
        { "fieldKey": "sfcId", "value": "缺陷类型名称" },
        { "fieldKey": "content", "value": "任务标题" },
        { "fieldKey": "executor", "value": "执行者名称" },
        { "fieldKey": "note", "value": "markdown描述" },
        { "fieldKey": "priority", "value": "紧急" }
      ]
    }]
  }
}
```

`PostMcpTaskCreate` 的优势：
- 支持 `dryRun: true` 先验证参数正确性，不真正创建
- 字段值可以传名称（如"缺陷"、"紧急"），接口自动识别，无需查 ID
- 验证通过后让用户确认，再用 `dryRun: false` 正式创建

**备选方式**——使用传统接口：
```
工具: CreateTaskV3
参数: {
  "requestBody": {
    "content": "任务标题",
    "projectId": "项目ID",
    "scenariofieldconfigId": "sfcId",
    "executorId": "执行者用户ID",
    "note": "markdown格式描述",
    "noteRenderMode": "markdown",
    "priority": -10
  }
}
```

## 第九步：更新自定义字段

```
工具: UpdateTaskCusomFieldV3  (注意拼写：Cusom 不是 Custom)
参数: {
  "taskId": "任务ID",
  "requestBody": {
    "customfieldId": "字段ID",
    "value": [{"id": "选项ID", "title": "显示值"}]
  }
}
```

也可以用 `customfieldName` 代替 `customfieldId`（按名称匹配），或用 `customfieldAlias` 按别名匹配。

支持 `addValues`（增量添加）和 `delValues`（增量删除）操作，适合多选字段。

另有 `UpdateTaskCustomField`（非 V3 版本），参数结构略有不同。

## 第十步：流转任务状态

```
工具: UpdateTaskStatusV3
参数: {
  "taskId": "任务ID",
  "requestBody": {
    "taskflowstatusId": "目标状态ID",
    "tfsUpdateNote": "流转说明"
  }
}
```

**关键踩坑点**：
- 建议用 `taskflowstatusId` 而非 `tfsName`（名称匹配严格）
- **必须按工作流顺序逐步流转，不能跳跃**
- 流转前先用 `SearchTaskflowStatusesV3` 确认当前状态的 `rejectStatusIds`（可达状态列表）
- 流转到某些状态可能要求填写必填自定义字段
- 错误码 `10020`：状态不可达，需要先走中间状态
- 错误码 `10003`：缺少必填字段，先用 `UpdateTaskCusomFieldV3` 补充

## 第十一步：添加评论

```
工具: CreateTaskCommentV3
参数: {
  "taskId": "任务ID",
  "requestBody": {
    "content": "评论内容",
    "renderMode": "markdown"
  }
}
```

## 第十二步：缺陷修复 Git 提交

修复缺陷并提交到本地 git 仓库的完整流程：

**1. 确认修复范围**
- 只修改与缺陷直接相关的代码，不夹带无关改动
- 修复逻辑必须与关联需求的预期行为一致

**2. 一个缺陷工单 = 一次独立 commit**
- 默认每修复一个缺陷工单就单独提交一次，不要把不同缺陷的修复混在一起
- **唯一例外**：多个缺陷工单实际是同一个 bug（同一根因、同一处修复），可以合并为一个 commit
- 合并前必须确认根因相同且修复代码完全重叠

**3. 暂存修改**
```bash
git add <修复涉及的文件>
```

**4. 提交（commit 信息必须带缺陷编号）**

单个缺陷：
```bash
git commit -m "fix(模块): 修复描述 [YKWP-编号]"
```

多个缺陷同一 bug（例外情况）：
```bash
git commit -m "fix(模块): 修复描述 [YKWP-12][YKWP-13]"
```

格式规范：
- 前缀：`fix` 表示缺陷修复
- 括号内：受影响的模块/组件名
- 方括号内：项目编号前缀 + 缺陷编号（从 `teambition-context.md` 获取前缀）
- 示例：`fix(sound): 修复音效播放时机错误导致重复触发 [YKWP-42]`

**5. 绝对禁止推送**
- **禁止执行** `git push` 或任何推送到远端的操作
- 如果用户要求 push，拒绝并说明原因
