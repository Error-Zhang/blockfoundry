import React from 'react';
import { Button, Card, Col, Divider, Form, Image, Input, List, Modal, Row, Select, Space, Tag } from 'antd';
import { TextureBundle, TextureResource } from '../types.ts';
import '../styles/Modals.less';

interface ModalsProps {
	// 新建/编辑模态框
	modalVisible: boolean;
	editingResource: TextureResource | null;
	form: any;
	loading: boolean;
	onModalCancel: () => void;
	onSubmit: (values: any) => void;

	// 预览模态框
	previewVisible: boolean;
	previewResource: TextureResource | null;
	onPreviewCancel: () => void;

	// 捆绑贴图管理模态框
	bundleModalVisible: boolean;
	currentMainTexture: TextureResource | null;
	resources: TextureResource[];
	onBundleModalCancel: () => void;
	onResourcesChange: (resources: TextureResource[]) => void;
}

const Modals: React.FC<ModalsProps> = ({
	modalVisible,
	editingResource,
	form,
	loading,
	onModalCancel,
	onSubmit,
	previewVisible,
	previewResource,
	onPreviewCancel,
	bundleModalVisible,
	currentMainTexture,
	resources,
	onBundleModalCancel,
	onResourcesChange,
}) => {
	return (
		<>
			{/* 新建/编辑模态框 */}
			<Modal
				title={editingResource ? '编辑纹理资源' : '新建纹理资源'}
				open={modalVisible}
				onCancel={onModalCancel}
				footer={null}
				width={600}
				className="resource-modal"
			>
				<Form form={form} layout="vertical" onFinish={onSubmit}>
					<Form.Item name="name" label="纹理名称" rules={[{ required: true, message: '请输入纹理名称' }]}>
						<Input placeholder="请输入纹理名称" />
					</Form.Item>

					<Form.Item name="description" label="描述">
						<Input.TextArea placeholder="请输入纹理描述" rows={3} />
					</Form.Item>

					<Row gutter={16}>
						<Col span={12}>
							<Form.Item name="width" label="宽度" rules={[{ required: true, message: '请输入宽度' }]}>
								<Input placeholder="像素" type="number" />
							</Form.Item>
						</Col>
						<Col span={12}>
							<Form.Item name="height" label="高度" rules={[{ required: true, message: '请输入高度' }]}>
								<Input placeholder="像素" type="number" />
							</Form.Item>
						</Col>
					</Row>

					<Form.Item name="tags" label="标签">
						<Select mode="tags" placeholder="输入标签，按回车添加" style={{ width: '100%' }} />
					</Form.Item>

					<Form.Item name="isPublic" label="可见性" rules={[{ required: true, message: '请选择可见性' }]}>
						<Select placeholder="请选择可见性">
							<Select.Option value={true}>公开</Select.Option>
							<Select.Option value={false}>私有</Select.Option>
						</Select>
					</Form.Item>

					<Form.Item>
						<Space>
							<Button onClick={onModalCancel}>取消</Button>
							<Button type="primary" htmlType="submit" loading={loading}>
								{editingResource ? '更新' : '创建'}
							</Button>
						</Space>
					</Form.Item>
				</Form>
			</Modal>

			{/* 预览模态框 */}
			<Modal
				title={`预览纹理: ${previewResource?.name}`}
				open={previewVisible}
				onCancel={onPreviewCancel}
				footer={null}
				width={800}
				centered
				className="preview-modal"
			>
				{previewResource && (
					<div>
						<Row gutter={16}>
							<Col span={12}>
								<div className="preview-image-container">
									<Image src={previewResource.originalUrl} alt={previewResource.name} className="preview-image" />
								</div>
							</Col>
							<Col span={12}>
								<List
									size="small"
									dataSource={[
										{ label: '文件名', value: previewResource.fileName },
										{ label: '类型', value: previewResource.isMainTexture ? '主纹理' : '捆绑纹理' },
										{
											label: '尺寸',
											value: `${previewResource.width} × ${previewResource.height}`,
										},
										{ label: '格式', value: previewResource.format },
										{
											label: '文件大小',
											value: `${(previewResource.fileSize / 1024).toFixed(1)} KB`,
										},
										{ label: '使用次数', value: previewResource.usageCount.toString() },
										{ label: '创建时间', value: previewResource.createdAt },
										{ label: '更新时间', value: previewResource.updatedAt },
									]}
									renderItem={(item) => (
										<List.Item>
											<List.Item.Meta title={item.label} description={item.value} />
										</List.Item>
									)}
								/>

								{previewResource.tags.length > 0 && (
									<div className="preview-tags">
										<Divider orientation="left" plain>
											标签
										</Divider>
										<Space wrap>
											{previewResource.tags.map((tag) => (
												<Tag key={tag}>{tag}</Tag>
											))}
										</Space>
									</div>
								)}
							</Col>
						</Row>
					</div>
				)}
			</Modal>

			{/* 纹理捆绑贴图管理模态框 */}
			<Modal
				title={`管理 "${currentMainTexture?.name}" 的捆绑贴图`}
				open={bundleModalVisible}
				onCancel={onBundleModalCancel}
				footer={null}
				width={500}
				className="bundle-modal"
			>
				{currentMainTexture && (
					<div>
						<div className="bundle-description">
							<strong>可捆绑的贴图类型：</strong>
						</div>

						<Space direction="vertical" style={{ width: '100%' }}>
							{(['normal', 'roughness', 'metallic', 'emissive', 'ao', 'height'] as (keyof TextureBundle)[]).map((type) => {
								const hasTexture = currentMainTexture.bundledTextures && currentMainTexture.bundledTextures[type];
								const relatedTexture = resources.find((r) => r.id === hasTexture);

								return (
									<Card
										key={type}
										size="small"
										title={
											<Space>
												<span>{type}</span>
												{hasTexture && <Tag color="green">已绑定</Tag>}
											</Space>
										}
										extra={
											<Space>
												{hasTexture ? (
													<>
														<Button
															size="small"
															onClick={() => {
																// 移除绑定
																const updatedResource = {
																	...currentMainTexture,
																	bundledTextures: {
																		...currentMainTexture.bundledTextures,
																		[type]: undefined,
																	},
																};
																onResourcesChange(resources.map((r) => (r.id === currentMainTexture.id ? updatedResource : r)));
															}}
														>
															解绑
														</Button>
													</>
												) : (
													<Button
														type="dashed"
														size="small"
														onClick={() => {
															// 创建新纹理并绑定
															const newTexture: TextureResource = {
																id: `${currentMainTexture.id}_${type}`,
																name: `${currentMainTexture.name}_${type}`,
																description: `${currentMainTexture.description}的${type}贴图`,
																fileName: `${currentMainTexture.fileName.replace(/\.[^/.]+$/, '')}_${type}${currentMainTexture.fileName.match(/\.[^/.]+$/)?.[0] || '.png'}`,
																filePath: `${currentMainTexture.filePath.replace(/\.[^/.]+$/, '')}_${type}${currentMainTexture.filePath.match(/\.[^/.]+$/)?.[0] || '.png'}`,
																fileSize: currentMainTexture.fileSize * 0.5,
																width: currentMainTexture.width,
																height: currentMainTexture.height,
																format: currentMainTexture.format,
																isMainTexture: false,
																tags: [...currentMainTexture.tags, type],
																thumbnailUrl: currentMainTexture.thumbnailUrl,
																originalUrl: currentMainTexture.originalUrl,
																createdAt: new Date().toISOString().split('T')[0],
																updatedAt: new Date().toISOString().split('T')[0],
																usageCount: 0,
																isPublic: currentMainTexture.isPublic,
															};

															// 更新主纹理的捆绑信息
															const updatedResource = {
																...currentMainTexture,
																bundledTextures: {
																	...currentMainTexture.bundledTextures,
																	[type]: newTexture.id,
																},
															};

															onResourcesChange([...resources.filter((r) => r.id !== currentMainTexture.id), updatedResource, newTexture]);
														}}
													>
														创建并绑定
													</Button>
												)}
											</Space>
										}
									>
										{hasTexture && relatedTexture ? (
											<div>
												<div>绑定的纹理: {relatedTexture.name}</div>
												<div>文件: {relatedTexture.fileName}</div>
												<div>大小: {(relatedTexture.fileSize / 1024).toFixed(1)} KB</div>
											</div>
										) : (
											<div className="bundle-empty">此类型贴图未绑定</div>
										)}
									</Card>
								);
							})}
						</Space>
					</div>
				)}
			</Modal>
		</>
	);
};

export default Modals;
