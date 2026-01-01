# 通用文件管理器组件使用指南

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