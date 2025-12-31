import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { UPLOAD_BASE_DIR } from '@/lib/constants';

export async function POST(request: NextRequest) {
    try {
        // 获取所有资源
        const resources = await prisma.textureResource.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (resources.length === 0) {
            return NextResponse.json({ error: '根目录为空' }, { status: 400 });
        }

        // 转换 tags 字段
        const allResources = resources.map((resource) => ({
            ...resource,
            tags: resource.tags ? JSON.parse(resource.tags) : [],
        }));

        // 创建 ZIP 文件
        const zip = new JSZip();

        console.log(`开始下载 ${allResources.length} 个资源`);

        // 下载所有文件并添加到 ZIP
        const downloadPromises = allResources.map(async (resource) => {
            try {
                console.log(`下载资源: ${resource.name}, URL: ${resource.originalUrl}`);
                
                // 从本地文件系统读取文件
                // originalUrl 格式: /uploads/textures/xxx.png
                // 需要转换为: data/uploads/textures/xxx.png
                const relativePath = resource.originalUrl.replace('/uploads/', '');
                const filePath = join(UPLOAD_BASE_DIR, relativePath);
                console.log(`读取本地文件: ${filePath}`);
                
                const fileBuffer = await readFile(filePath);
                console.log(`文件大小: ${fileBuffer.byteLength} bytes`);
                
                // 使用 filePath 构建文件在 ZIP 中的路径
                const pathParts = resource.filePath.split('.');
                const fileName = resource.fileName || resource.name;
                
                // 构建文件在 ZIP 中的路径
                let zipPath = fileName;
                if (pathParts.length > 1) {
                    // 有文件夹结构
                    const folders = pathParts.slice(0, -1).join('/');
                    zipPath = `${folders}/${fileName}`;
                }
                
                console.log(`添加到 ZIP: ${zipPath}`);
                zip.file(zipPath, fileBuffer);
                return true;
            } catch (error) {
                console.error(`下载文件失败: ${resource.name}`, error);
                return false;
            }
        });

        // 等待所有文件下载完成
        const results = await Promise.all(downloadPromises);
        const successCount = results.filter(r => r).length;
        console.log(`成功下载 ${successCount}/${allResources.length} 个文件`);
        console.log(`ZIP 中的文件数: ${Object.keys(zip.files).length}`);

        // 生成 ZIP 文件，支持中文文件名
        const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: {
                level: 6
            }
        });

        // 返回 ZIP 文件
        return new NextResponse(zipBlob, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="texture-resources.zip"',
            },
        });
    } catch (error) {
        console.error('下载根目录失败:', error);
        return NextResponse.json({ error: '下载根目录失败' }, { status: 500 });
    }
}