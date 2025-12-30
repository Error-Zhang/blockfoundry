'use client';

import React, { useState, useRef } from 'react';
import { Card, Button, Upload, Table, Space, Modal, Form, Input, InputNumber, App, Popconfirm, Image, Tag, Tooltip } from 'antd';
import { UploadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';

// 纹理图集接口定义
interface TextureAtlas {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  imageUrl: string;
  sprites: Sprite[];
  createdAt: string;
  updatedAt: string;
  fileSize: number;
  format: string;
}

interface Sprite {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated?: boolean;
  trimmed?: boolean;
  sourceSize?: { w: number; h: number };
}

export default function TextureAtlasManagementPage() {
  const { message } = App.useApp();
  const [atlases, setAtlases] = useState<TextureAtlas[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAtlas, setEditingAtlas] = useState<TextureAtlas | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewAtlas, setPreviewAtlas] = useState<TextureAtlas | null>(null);
  const [form] = Form.useForm();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 模拟数据
  React.useEffect(() => {
    const mockData: TextureAtlas[] = [
      {
        id: '1',
        name: '游戏角色图集',
        description: '包含主角和NPC的所有动画帧',
        width: 1024,
        height: 1024,
        imageUrl: '/api/placeholder/1024/1024',
        sprites: [
          { id: 's1', name: 'player_idle', x: 0, y: 0, width: 64, height: 64 },
          { id: 's2', name: 'player_walk_1', x: 64, y: 0, width: 64, height: 64 },
          { id: 's3', name: 'player_walk_2', x: 128, y: 0, width: 64, height: 64 },
        ],
        createdAt: '2024-01-15',
        updatedAt: '2024-01-20',
        fileSize: 256000,
        format: 'PNG',
      },
      {
        id: '2',
        name: 'UI元素图集',
        description: '游戏界面相关的图标和按钮',
        width: 512,
        height: 512,
        imageUrl: '/api/placeholder/512/512',
        sprites: [
          { id: 's4', name: 'button_normal', x: 0, y: 0, width: 128, height: 32 },
          { id: 's5', name: 'button_hover', x: 0, y: 32, width: 128, height: 32 },
          { id: 's6', name: 'icon_health', x: 128, y: 0, width: 32, height: 32 },
        ],
        createdAt: '2024-01-10',
        updatedAt: '2024-01-18',
        fileSize: 128000,
        format: 'PNG',
      },
    ];
    setAtlases(mockData);
  }, []);

  // 表格列定义
  const columns: ColumnsType<TextureAtlas> = [
    {
      title: '预览',
      dataIndex: 'imageUrl',
      key: 'preview',
      width: 80,
      render: (imageUrl: string, record: TextureAtlas) => (
        <Image
          width={50}
          height={50}
          src={imageUrl}
          alt={record.name}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
        />
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: TextureAtlas) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.description && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{record.description}</div>}
        </div>
      ),
    },
    {
      title: '尺寸',
      key: 'size',
      render: (_, record: TextureAtlas) => (
        <Tag color="blue">
          {record.width} × {record.height}
        </Tag>
      ),
    },
    {
      title: '精灵数量',
      key: 'spriteCount',
      render: (_, record: TextureAtlas) => <Tag color="green">{record.sprites.length} 个</Tag>,
    },
    {
      title: '文件大小',
      key: 'fileSize',
      render: (_, record: TextureAtlas) => <span>{(record.fileSize / 1024).toFixed(1)} KB</span>,
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      render: (format: string) => <Tag>{format}</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      fixed: 'right' as const,
      render: (_, record: TextureAtlas) => (
        <Space>
          <Tooltip title="预览">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handlePreview(record)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="下载">
            <Button type="text" icon={<DownloadOutlined />} onClick={() => handleDownload(record)} />
          </Tooltip>
          <Popconfirm title="确定要删除这个图集吗?" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 处理上传
  const handleUpload = (file: UploadFile) => {
    setLoading(true);
    // 模拟上传处理
    setTimeout(() => {
      message.success('图集上传成功!');
      setLoading(false);
      // 这里应该调用API创建新的图集
    }, 2000);
    return false; // 阻止默认上传行为
  };

  // 处理新建/编辑
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      if (editingAtlas) {
        // 更新图集
        const updatedAtlases = atlases.map((atlas) =>
          atlas.id === editingAtlas.id ? { ...atlas, ...values, updatedAt: new Date().toISOString().split('T')[0] } : atlas
        );
        setAtlases(updatedAtlases);
        message.success('图集更新成功!');
      } else {
        // 创建新图集
        const newAtlas: TextureAtlas = {
          id: Date.now().toString(),
          ...values,
          sprites: [],
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
          fileSize: 0,
          format: 'PNG',
        };
        setAtlases([...atlases, newAtlas]);
        message.success('图集创建成功!');
      }
      setModalVisible(false);
      setEditingAtlas(null);
      form.resetFields();
    } catch (error) {
      message.error('操作失败,请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理编辑
  const handleEdit = (atlas: TextureAtlas) => {
    setEditingAtlas(atlas);
    form.setFieldsValue(atlas);
    setModalVisible(true);
  };

  // 处理删除
  const handleDelete = (id: string) => {
    setAtlases(atlases.filter((atlas) => atlas.id !== id));
    message.success('图集删除成功!');
  };

  // 处理预览
  const handlePreview = (atlas: TextureAtlas) => {
    setPreviewAtlas(atlas);
    setPreviewVisible(true);
  };

  // 处理下载
  const handleDownload = (atlas: TextureAtlas) => {
    // 模拟下载
    message.info('开始下载图集文件...');
  };

  return (
    <div>
      <Card
        title="图集纹理管理"
        extra={
          <Space>
            <Upload accept="image/*" showUploadList={false} beforeUpload={handleUpload}>
              <Button icon={<UploadOutlined />} loading={loading}>
                上传图集
              </Button>
            </Upload>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingAtlas(null);
                form.resetFields();
                setModalVisible(true);
              }}
            >
              新建图集
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={atlases}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个图集`,
          }}
        />
      </Card>

      {/* 新建/编辑模态框 */}
      <Modal
        title={editingAtlas ? '编辑图集' : '新建图集'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingAtlas(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="图集名称" rules={[{ required: true, message: '请输入图集名称' }]}>
            <Input placeholder="请输入图集名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入图集描述" rows={3} />
          </Form.Item>

          <Form.Item label="图集尺寸">
            <Input.Group compact>
              <Form.Item name="width" noStyle rules={[{ required: true, message: '请输入宽度' }]}>
                <InputNumber placeholder="宽度" min={1} max={4096} style={{ width: '45%' }} />
              </Form.Item>
              <span style={{ display: 'inline-block', width: '10%', textAlign: 'center' }}>×</span>
              <Form.Item name="height" noStyle rules={[{ required: true, message: '请输入高度' }]}>
                <InputNumber placeholder="高度" min={1} max={4096} style={{ width: '45%' }} />
              </Form.Item>
            </Input.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingAtlas ? '更新' : '创建'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        title={`预览图集: ${previewAtlas?.name}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={800}
        centered
      >
        {previewAtlas && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag color="blue">
                  尺寸: {previewAtlas.width} × {previewAtlas.height}
                </Tag>
                <Tag color="green">精灵: {previewAtlas.sprites.length} 个</Tag>
                <Tag>格式: {previewAtlas.format}</Tag>
              </Space>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Image src={previewAtlas.imageUrl} alt={previewAtlas.name} style={{ maxWidth: '100%', maxHeight: 400 }} />
            </div>

            {previewAtlas.sprites.length > 0 && (
              <div>
                <h4>精灵列表</h4>
                <Table
                  size="small"
                  columns={[
                    { title: '名称', dataIndex: 'name', key: 'name' },
                    { title: 'X', dataIndex: 'x', key: 'x', width: 60 },
                    { title: 'Y', dataIndex: 'y', key: 'y', width: 60 },
                    { title: '宽度', dataIndex: 'width', key: 'width', width: 80 },
                    { title: '高度', dataIndex: 'height', key: 'height', width: 80 },
                  ]}
                  dataSource={previewAtlas.sprites}
                  rowKey="id"
                  pagination={false}
                  scroll={{ y: 200 }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}