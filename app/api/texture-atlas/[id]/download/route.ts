import { z } from 'zod';
import { apiHandler } from '@/app/api/lib/api-handler';
import { getAtlasById } from '@/app/api/texture-atlas/service';
import { DIR_NAMES, FileStorage } from '@/lib/file-storage';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import { AtlasRepo } from '@/app/api/texture-atlas/atlas.repo';
import { FileResponse, ZipResponse } from '@/app/api/lib/response';

const AtlasParams = z.object({
	id: z.string().min(1, '缺少图集ID'),
});

export const GET = apiHandler({
	params: AtlasParams,
	handler: async ({ params, user }) => {
		const { id } = params;
		const atlas = await AtlasRepo.getById(id, user.id);

		const imagePath = FileStorage.getFilePath(DIR_NAMES.ATLASES, atlas.name, atlas.format);
		const jsonPath = FileStorage.getFilePath(DIR_NAMES.ATLASES, atlas.name, 'json');

		const imageBuffer = await readFile(imagePath);
		const jsonBuffer = await readFile(jsonPath);

		const zip = new JSZip();
		zip.file(`${atlas.name}.${atlas.format.toLowerCase()}`, imageBuffer);
		zip.file(`${atlas.name}.json`, jsonBuffer);

		const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

		return ZipResponse(zipBuffer, `${atlas.name}.zip`);
	},
});
