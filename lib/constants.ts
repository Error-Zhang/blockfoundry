import { join } from 'path';

// 上传目录路径
export const UPLOAD_BASE_DIR = join(process.cwd(), 'data', 'uploads');
export const TEXTURE_UPLOAD_DIR = join(UPLOAD_BASE_DIR, 'textures');