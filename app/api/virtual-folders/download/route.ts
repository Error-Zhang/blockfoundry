import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { UPLOAD_BASE_DIR } from '@/lib/constants';

export async function POST(request: NextRequest) {
    try {
        const { folderId } = await request.json();

        if (!folderId) {
            return NextResponse.json({ error: '缺少文件夹ID' }, { status: 400 });
        }

        // 获取虚拟文件夹信息
        const folder = await prisma.virtualFolder.findUnique({
            where: { id: folderId },
        });
        
        if (!folder) {
            return NextResponse.json({ error: '获取文件夹信息失败' }, { status: 500 });
        }

        const folderPath = folder.path;
        const folderName = folder.name;

        // 获取文件夹下的所有资源
        const resources = await prisma.textureResource.findMany({
            where: {
                OR: [
                    { filePath: folderPath },
                    { filePath: { startsWith: `${folderPath}.` } },
                ],
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (resources.length === 0) {
            return NextResponse.json({ error: '文件夹为空' }, { status: 400 });
        }

        // 转换 tags 字段
        const folderResources = resources.map((resource) => ({
            ...resource,
            tags: resource.tags ? JSON.parse(resource.tags) : [],
        }));

        // 创建 ZIP 文件
        const zip = new JSZip();

        // 下载所有文件并添加到 ZIP
        const downloadPromises = folderResources.map(async (resource) => {
            try {
                // 从本地文件系统读取文件
                // originalUrl 格式: /uploads/textures/xxx.png
                // 需要转换为: data/uploads/textures/xxx.png
                const fileRelativePath = resource.originalUrl.replace('/uploads/', '');
                const filePath = join(UPLOAD_BASE_DIR, fileRelativePath);
                const fileBuffer = await readFile(filePath);
                
                // 计算相对路径
                const zipRelativePath = resource.filePath.replace(`${folderPath}.`, '').replace(folderPath, '');
                const pathParts = zipRelativePath.split('.');
                const fileName = resource.fileName || resource.name;
                
                // 构建文件在 ZIP 中的路径
                let zipPath = fileName;
                if (pathParts.length > 1 && pathParts[0]) {
                    // 有子文件夹
                    const subFolders = pathParts.slice(0, -1).join('/');
                    zipPath = `${subFolders}/${fileName}`;
                }
                
                zip.file(zipPath, fileBuffer);
                return true;
            } catch (error) {
                console.error(`下载文件失败: ${resource.name}`, error);
                return false;
            }
        });

        // 等待所有文件下载完成
        await Promise.all(downloadPromises);

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
                'Content-Disposition': 'attachment; filename="folder.zip"',
            },
        });
    } catch (error) {
        console.error('下载文件夹失败:', error);
        return NextResponse.json({ error: '下载文件夹失败' }, { status: 500 });
    }
}