# FileTree 通用文件树组件

一个功能完整、高度可定制的 React 文件树组件,支持文件夹管理、文件上传、拖拽、右键菜单等功能。

## 特性

- 🌲 **通用树结构** - 支持文件夹和文件的层级展示
- 📝 **内联编辑** - 双击节点即可重命名
- 🖱️ **右键菜单** - 可自定义的上下文菜单
- 🎯 **拖拽支持** - 支持文件和文件夹的拖拽移动
- 📋 **剪贴板操作** - 支持复制、剪切、粘贴
- 📁 **文件夹操作** - 新建、重命名、删除、清空、下载
- 📄 **文件操作** - 上传、重命名、删除、下载、移动
- 🎨 **可调整宽度** - 支持拖拽调整组件宽度
- 🔧 **高度可配置** - 支持自定义图标、菜单、验证等
- 💪 **TypeScript** - 完整的类型定义

## 安装

```bash
# 该组件已包含在项目中
# 依赖: react, antd
```

## 快速开始

### 基础用法 - FileTree 组件

最简单的文件树展示:

```tsx
import { FileTree, TreeNode } from '@/app/components/common/FileTree';

const treeData: TreeNode[] = [
  {
    key: 'root',
    title: '根目录',
    nodeType: 'root',
    path: 'root',
    children: [
      {
        key: 'folder-1',
        title: '文件夹1',
        nodeType: 'folder',
        path: 'root.folder1',
        children: [
          {
            key: 'file-1',
            title: '文件1.txt',
            nodeType: 'file',
            path: 'root.folder1.file1.txt',
            isLeaf: true,
          },
        ],
      },
    ],
  },
];

function App() {
  return (
    <FileTree
      treeData={treeData}
      onSelect={(keys, node) => console.log('选中:', node)}
    />
  );
}
```

### 高级用法 - GenericFileManager 组件

完整的文件管理器,包含所有文件操作功能:

```tsx
import { GenericFileManager, FileManagerApiService } from '@/app/components/common/FileTree';

// 定义你的数据类型
interface MyFile {
  id: string;
  name: string;
  folderId: string;
  content?: string;
}

interface MyFolder {
  id: string;
  name: string;
  path: string;
  parentId: string;
}

// 实现 API 服务
const apiService: FileManagerApiService<MyFile, MyFolder> = {
  // 文件夹操作
  getFolders: async () => ({ success: true, data: folders }),
  createFolder: async (name, parentId) => ({ success: true, data: newFolder }),
  renameFolder: async (id, name) => ({ success: true, data: updatedFolder }),
  deleteFolder: async (id) => ({ success: true }),
  moveFolder: async (id, targetParentId) => ({ success: true, data: movedFolder }),
  copyFolder: async (id, targetParentId) => ({ success: true, data: copiedFolder }),
  clearFolder: async (id) => ({ success: true }),
  downloadFolder: async (id) => new Blob(),

  // 文件操作
  createFile: async (params) => ({ success: true, data: newFile }),
  updateFile: async (id, data) => ({ success: true, data: updatedFile }),
  deleteFile: async (id) => ({ success: true }),
  copyFile: async (id, targetFolderId) => ({ success: true, data: copiedFile }),
};

function App() {
  const [files, setFiles] = useState<MyFile[]>([]);

  return (
    <GenericFileManager
      files={files}
      apiService={apiService}
      onFileSelect={(file) => console.log('选中文件:', file)}
      onFolderSelect={(folder) => console.log('选中文件夹:', folder)}
      onNodeChange={() => {
        // 刷新文件列表
        loadFiles();
      }}
      fileUploadConfig={{
        accept: '.txt,.json',
        validate: async (file) => {
          if (file.size > 1024 * 1024) {
            message.error('文件大小不能超过 1MB');
            return false;
          }
          return true;
        },
        buildFileData: (file, folderId) => ({
          name: file.name,
          folderId,
          content: await file.text(),
        }),
      }}
      downloadFile={(file) => {
        // 自定义下载逻辑
        const blob = new Blob([file.content || '']);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
      }}
    />
  );
}
```

## API 文档

### FileTree Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| treeData | `TreeNode[]` | - | 树数据 |
| selectedKeys | `string[]` | - | 选中的节点 key |
| onSelect | `(keys: string[], node: TreeNode) => void` | - | 节点选中回调 |
| expandedKeys | `string[]` | - | 展开的节点 key |
| onExpand | `(keys: string[]) => void` | - | 节点展开回调 |
| defaultExpandAll | `boolean` | `true` | 默认展开所有节点 |
| contextMenuItems | `(node: TreeNode) => ContextMenuItem[]` | - | 右键菜单项生成函数 |
| onContextMenuAction | `(action: string, node: TreeNode) => void` | - | 右键菜单操作回调 |
| onNodeEdit | `(node: TreeNode, newValue: string) => Promise<boolean>` | - | 节点编辑回调 |
| draggable | `boolean` | `true` | 是否可拖拽 |
| onDrop | `(info: DragInfo) => void` | - | 拖拽放置回调 |
| allowDrop | `(info) => boolean` | - | 是否允许放置 |
| width | `number` | `300` | 组件宽度 |
| onWidthChange | `(width: number) => void` | - | 宽度改变回调 |
| resizable | `boolean` | `true` | 是否可调整宽度 |
| minWidth | `number` | `200` | 最小宽度 |
| maxWidth | `number` | `600` | 最大宽度 |
| title | `string` | `'目录'` | 标题 |
| showExpandButton | `boolean` | `true` | 是否显示展开/折叠按钮 |

### GenericFileManager Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| files | `TFile[]` | - | 文件列表 |
| apiService | `FileManagerApiService` | - | API 服务实现 |
| onFileSelect | `(file: TFile) => void` | - | 文件选中回调 |
| onFolderSelect | `(folder: TFolder) => void` | - | 文件夹选中回调 |
| onNodeChange | `() => void` | - | 节点变化回调 |
| fileUploadConfig | `FileUploadConfig` | - | 文件上传配置 |
| fileIcon | `ReactNode` | - | 自定义文件图标 |
| downloadFile | `(file: TFile) => void` | - | 自定义下载逻辑 |
| customContextMenu | `(node, defaultMenu) => ContextMenuItem[]` | - | 自定义右键菜单 |
| width | `number` | `300` | 组件宽度 |
| onWidthChange | `(width: number) => void` | - | 宽度改变回调 |
| allowRootEdit | `boolean` | `true` | 是否允许编辑根节点 |

### TreeNode 类型

```typescript
interface TreeNode<T = any> {
  key: string;              // 唯一标识
  title: string;            // 显示名称
  nodeType: 'folder' | 'file' | 'root';  // 节点类型
  path: string;             // 节点路径
  icon?: ReactNode;         // 自定义图标
  isLeaf?: boolean;         // 是否为叶子节点
  children?: TreeNode<T>[]; // 子节点
  data?: T;                 // 关联的业务数据
  isEditing?: boolean;      // 是否处于编辑状态
}
```

### FileManagerApiService 接口

```typescript
interface FileManagerApiService<TFile, TFolder> {
  // 文件夹操作
  getFolders: () => Promise<ApiResponse<TFolder[]>>;
  createFolder: (name: string, parentId: string) => Promise<ApiResponse<TFolder>>;
  renameFolder: (id: string, name: string) => Promise<ApiResponse<TFolder>>;
  deleteFolder: (id: string) => Promise<ApiResponse<void>>;
  moveFolder: (id: string, targetParentId: string) => Promise<ApiResponse<TFolder>>;
  copyFolder: (id: string, targetParentId: string) => Promise<ApiResponse<TFolder>>;
  clearFolder: (id: string) => Promise<ApiResponse<void>>;
  downloadFolder: (id: string) => Promise<Blob>;

  // 文件操作
  createFile: (params: unknown) => Promise<ApiResponse<TFile>>;
  updateFile: (id: string, data: Partial<TFile>) => Promise<ApiResponse<TFile>>;
  deleteFile: (id: string) => Promise<ApiResponse<void>>;
  copyFile: (id: string, targetFolderId: string) => Promise<ApiResponse<TFile>>;
}
```

## 使用示例

### 1. 自定义右键菜单

```tsx
<FileTree
  treeData={treeData}
  contextMenuItems={(node) => {
    const items: ContextMenuItem[] = [];
    
    if (node.nodeType === 'file') {
      items.push(
        { key: 'open', label: '打开', icon: <FileOutlined /> },
        { key: 'rename', label: '重命名', icon: <EditOutlined /> },
        { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true }
      );
    }
    
    return items;
  }}
  onContextMenuAction={(action, node) => {
    switch (action) {
      case 'open':
        console.log('打开文件:', node);
        break;
      case 'rename':
        node.isEditing = true;
        break;
      case 'delete':
        console.log('删除文件:', node);
        break;
    }
  }}
/>
```

### 2. 自定义文件上传验证

```tsx
<GenericFileManager
  files={files}
  apiService={apiService}
  fileUploadConfig={{
    accept: '.json',
    validate: async (file) => {
      try {
        const content = await file.text();
        JSON.parse(content);
        return true;
      } catch {
        message.error('请上传有效的 JSON 文件');
        return false;
      }
    },
    buildFileData: (file, folderId) => ({
      name: file.name,
      folderId,
    }),
  }}
/>
```

### 3. 自定义拖拽规则

```tsx
<FileTree
  treeData={treeData}
  draggable={true}
  allowDrop={(info) => {
    const { dropNode, dropPosition } = info;
    
    // 只允许拖拽到文件夹内部
    if (dropNode.nodeType === 'folder' && dropPosition === 0) {
      return true;
    }
    
    return false;
  }}
  onDrop={(info) => {
    const { dragNode, dropNode, dropPosition } = info;
    console.log('拖拽:', dragNode.title, '到', dropNode.title, dropPosition);
  }}
/>
```

### 4. 受控模式

```tsx
function App() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  return (
    <FileTree
      treeData={treeData}
      selectedKeys={selectedKeys}
      onSelect={(keys) => setSelectedKeys(keys)}
      expandedKeys={expandedKeys}
      onExpand={(keys) => setExpandedKeys(keys)}
    />
  );
}
```

## 内置 Hooks

### useContextMenu

管理右键菜单状态:

```tsx
const { visible, position, selectedNodeKey, show, hide } = useContextMenu();
```

### useNodeEdit

管理节点编辑状态:

```tsx
const { editingNode, editingValue, startEdit, cancelEdit, updateValue } = useNodeEdit();
```

### useResizable

管理组件宽度调整:

```tsx
const { isResizing, containerRef, resizeRef, handleMouseDown } = useResizable(
  width,
  minWidth,
  maxWidth,
  onWidthChange
);
```

## 工具函数

### findNode

在树中查找节点:

```tsx
import { findNode } from '@/app/components/common/FileTree/hooks';

const node = findNode(treeData, 'node-key');
```

### getAllExpandableKeys

获取所有可展开节点的 key:

```tsx
import { getAllExpandableKeys } from '@/app/components/common/FileTree/hooks';

const keys = getAllExpandableKeys(treeData);
```

### buildPath

构建节点路径:

```tsx
import { buildPath } from '@/app/components/common/FileTree/treeUtils';

const path = buildPath('parent.path', 'child');
// 结果: 'parent.path.child'
```

## 样式定制

组件使用 SCSS 模块化样式,可以通过覆盖 CSS 变量或类名来定制样式:

```scss
.fileTreeWrapper {
  // 自定义样式
}

.treeNodeTitle {
  // 节点标题样式
}

.resizeHandle {
  // 拖拽手柄样式
}
```

## 注意事项

1. **数据结构**: 确保 `TreeNode` 的 `key` 唯一
2. **路径格式**: 路径使用 `.` 分隔,如 `root.folder1.file1.txt`
3. **API 响应**: API 服务需要返回 `ApiResponse<T>` 格式
4. **错误处理**: 组件内部使用 `useErrorHandler` 处理错误
5. **性能优化**: 大量节点时建议使用虚拟滚动

## 完整示例

查看项目中的使用示例:

- `app/components/PromptManager/PromptFileTree.tsx` - Prompt 文件管理
- `app/components/DatasetManager/DatasetFileTree.tsx` - 数据集文件管理

## License

MIT# 通用文件管理器组件使用指南

## 概述

`GenericFileManager` 是一个高度可配置的通用文件管理器组件,支持文件和文件夹的完整管理功能。它使用泛型设计,可以适配不同的数据模型和 API 接口。

## 核心特性

- ✅ 完整的文件/文件夹 CRUD 操作
- ✅ 拖拽移动文件和文件夹
- ✅ 复制/剪切/粘贴功能
- ✅ 文件上传(支持自定义验证)
- ✅ 文件夹下载/清空
- ✅ 右键上下文菜单(可自定义)
- ✅ 可调整宽度
- ✅ 完全类型安全

## 基础接口

### BaseFileResource

所有文件资源必须实现此接口:

```typescript
interface BaseFileResource {
  id: string;
  name: string;
  filePath: string;
}
```

### BaseVirtualFolder

所有虚拟文件夹必须实现此接口:

```typescript
interface BaseVirtualFolder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
}
```

## API 服务接口

需要提供一个实现 `FileManagerApiService` 接口的服务对象:

```typescript
interface FileManagerApiService<TFile, TFolder> {
  // 文件夹操作
  getFolders: () => Promise<TFolder[]>;
  createFolder: (data: { name: string; parentId: string | null }) => Promise<TFolder>;
  renameFolder: (id: string, name: string) => Promise<TFolder>;
  deleteFolder: (id: string) => Promise<void>;
  moveFolder: (id: string, targetParentId: string | null) => Promise<TFolder>;
  copyFolder: (id: string, targetParentId: string | null) => Promise<TFolder>;
  clearFolder: (id: string) => Promise<void>;
  downloadFolder: (id: string) => Promise<Blob>;

  // 文件操作
  createFile: (data: any) => Promise<TFile>;
  updateFile: (id: string, data: Partial<TFile>) => Promise<TFile>;
  deleteFile: (id: string) => Promise<void>;
  copyFile: (id: string, newFilePath: string) => Promise<TFile>;
}
```

## 使用示例

### 1. 纹理资源管理器(已实现)

```typescript
import { GenericFileManager, FileManagerApiService } from '@/app/components/common/FileManager';
import { TextureResource } from '../lib/types';
import { VirtualFolder } from '../services/virtualFolderService';

// 创建 API 服务适配器
const apiService: FileManagerApiService<TextureResource, VirtualFolder> = {
  getFolders: getVirtualFolders,
  createFolder: createVirtualFolder,
  renameFolder: renameVirtualFolder,
  deleteFolder: deleteVirtualFolder,
  moveFolder: moveVirtualFolder,
  copyFolder: copyVirtualFolder,
  clearFolder: clearVirtualFolder,
  downloadFolder: downloadVirtualFolder,
  createFile: createTextureResource,
  updateFile: updateTextureResource,
  deleteFile: deleteTextureResource,
  copyFile: copyTextureResource,
};

// 使用组件
<GenericFileManager<TextureResource, VirtualFolder>
  files={resources}
  onFilesChange={onResourcesChange}
  apiService={apiService}
  onFileSelect={onResourceSelect}
  onFolderSelect={onFolderSelect}
  fileUploadConfig={{
    accept: 'image/*',
    validate: (file) => file.type.startsWith('image/'),
    buildFileData: (file, folderPath) => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      tags: [],
      isPublic: true,
      folderPath,
    }),
  }}
  fileIcon={<FileImageOutlined />}
  downloadFile={downloadTextureResource}
/>
```

### 2. 我的世界方块管理器(示例)

```typescript
// 定义方块资源类型
interface BlockResource extends BaseFileResource {
  id: string;
  name: string;
  filePath: string;
  blockType: string;
  hardness: number;
  resistance: number;
  // ... 其他方块属性
}

// 定义方块文件夹类型
interface BlockFolder extends BaseVirtualFolder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
}

// 创建 API 服务
const blockApiService: FileManagerApiService<BlockResource, BlockFolder> = {
  getFolders: getBlockFolders,
  createFolder: createBlockFolder,
  renameFolder: renameBlockFolder,
  deleteFolder: deleteBlockFolder,
  moveFolder: moveBlockFolder,
  copyFolder: copyBlockFolder,
  clearFolder: clearBlockFolder,
  downloadFolder: downloadBlockFolder,
  createFile: createBlockResource,
  updateFile: updateBlockResource,
  deleteFile: deleteBlockResource,
  copyFile: copyBlockResource,
};

// 使用组件
<GenericFileManager<BlockResource, BlockFolder>
  files={blocks}
  onFilesChange={setBlocks}
  apiService={blockApiService}
  onFileSelect={onBlockSelect}
  onFolderSelect={onFolderSelect}
  fileUploadConfig={{
    accept: '.json,.mcblock',
    validate: async (file) => {
      // 自定义验证逻辑
      if (!file.name.endsWith('.json') && !file.name.endsWith('.mcblock')) {
        return false;
      }
      return true;
    },
    buildFileData: (file, folderPath) => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      blockType: 'custom',
      hardness: 1.0,
      resistance: 1.0,
      folderPath,
    }),
  }}
  fileIcon={<BlockOutlined />}
  downloadFile={downloadBlockResource}
  customContextMenu={(nodeType, node, defaultMenu) => {
    // 为方块文件添加自定义菜单项
    if (nodeType === 'file') {
      return [
        ...defaultMenu.slice(0, 3),
        { key: 'edit_properties', label: '编辑属性', icon: <SettingOutlined /> },
        { key: 'test_block', label: '测试方块', icon: <ExperimentOutlined /> },
        ...defaultMenu.slice(3),
      ];
    }
    return defaultMenu;
  }}
/>
```

## 配置选项

### FileManagerConfig

```typescript
interface FileManagerConfig<TFile, TFolder> {
  // 必需配置
  files: TFile[];                              // 文件列表
  onFilesChange: (files: TFile[]) => void;     // 文件变更回调
  apiService: FileManagerApiService<TFile, TFolder>; // API 服务
  onFileSelect: (file: TFile | null) => void;  // 文件选择回调
  onFolderSelect: (folderPath: string) => void; // 文件夹选择回调

  // 可选配置
  onFolderCreated?: () => void;                // 文件夹创建回调
  onFolderCountChange?: (count: number) => void; // 文件夹数量变更回调
  
  // 文件上传配置
  fileUploadConfig?: {
    accept?: string;                           // 接受的文件类型
    validate?: (file: File) => boolean | Promise<boolean>; // 自定义验证
    buildFileData: (file: File, folderPath: string) => any; // 构建文件数据
  };

  fileIcon?: React.ReactNode;                  // 自定义文件图标
  downloadFile?: (file: TFile) => void;        // 自定义下载逻辑
  
  // 自定义上下文菜单
  customContextMenu?: (
    nodeType: TreeNodeType,
    node: TreeNode<TFile>,
    defaultMenu: ContextMenuItem[]
  ) => ContextMenuItem[];

  width?: number;                              // 初始宽度
  onWidthChange?: (width: number) => void;     // 宽度变更回调
  allowRootEdit?: boolean;                     // 是否允许编辑根节点
}
```

## 迁移指南

如果你有现有的文件管理组件,可以按以下步骤迁移:

1. **定义数据类型**:确保你的文件和文件夹类型继承 `BaseFileResource` 和 `BaseVirtualFolder`

2. **创建 API 服务适配器**:将现有的 API 函数包装成 `FileManagerApiService` 接口

3. **配置文件上传**:使用 `fileUploadConfig` 配置文件上传逻辑

4. **替换组件**:用 `GenericFileManager` 替换原有组件

5. **测试功能**:确保所有功能正常工作

## 注意事项

1. 所有 API 方法都应该返回 Promise
2. 文件路径使用点号(.)分隔,如 `root.folder1.folder2.file`
3. 根文件夹的 `parentId` 应为 `null`
4. 自定义验证函数可以是同步或异步的
5. 上下文菜单可以完全自定义,但建议保留基础功能

## 扩展性

组件设计为高度可扩展:

- 通过 `customContextMenu` 添加自定义菜单项
- 通过 `fileUploadConfig.validate` 添加自定义验证
- 通过 `fileIcon` 自定义文件图标
- 通过 `downloadFile` 自定义下载逻辑
- 所有回调都可以用于集成外部状态管理