import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { UPLOAD_BASE_DIR } from '@/lib/constants';
import { withAuthHandler } from '@/lib/auth-middleware';

export const POST = withAuthHandler(async (request: NextRequest, context, user) => {
    try {
        const { folderId } = await request.json();

        if (!folderId) {
            return NextResponse.json({ error: '缺少文件夹ID' }, { status: 400 });
        }

        // 获取虚拟文件夹信息
        const folder = await prisma.virtualFolder.findUnique({
            where: { id: folderId, userId: user.id },
        });
        
        if (!folder) {
            return NextResponse.json({ error: '获取文件夹信息失败' }, { status: 500 });
        }

        const folderPath = folder.path;
        const folderName = folder.name;

        // 获取所有子文件夹
        const subFolders = await prisma.virtualFolder.findMany({
            where: {
                userId: user.id,
                path: {
                    startsWith: `${folderPath}.`,
                },
            },
        });

        // 获取当前文件夹及其所有子文件夹的ID
        const folderIds = [folderId, ...subFolders.map(f => f.id)];

        // 获取文件夹下的所有资源
        const resources = await prisma.textureResource.findMany({
            where: {
                userId: user.id,
                folderId: {
                    in: folderIds,
                },
            },
            include: {
                folder: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (resources.length === 0) {
            return NextResponse.json({ error: '文件夹为空' }, { status: 400 });
        }

        // 创建 ZIP 文件
        const zip = new JSZip();

        // 下载所有文件并添加到 ZIP
        const downloadPromises = resources.map(async (resource) => {
            try {
                // 从本地文件系统读取文件
                const filePath = join(UPLOAD_BASE_DIR, 'textures', resource.fileName);
                const fileBuffer = await readFile(filePath);
                
                // 构建文件在 ZIP 中的路径
                let zipPath = resource.fileName;
                
                if (resource.folder && resource.folder.path !== folderPath) {
                    // 资源在子文件夹中，计算相对路径
                    const relativePath = resource.folder.path.replace(`${folderPath}.`, '');
                    const subFolders = relativePath.split('.').join('/');
                    zipPath = `${subFolders}/${resource.fileName}`;
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
});