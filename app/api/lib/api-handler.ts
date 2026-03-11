import { z, ZodString } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/app/api/lib/auth-middleware';
import { InvalidParamsResponse } from '@/app/api/lib/response';

export interface ApiHandlerContext {
	user: {
		id: number;
		email: string;
		name: string;
	};
	params: any & { id: string };
	request: NextRequest;
}

/**
 * 解析并验证 URL 参数（params）
 */
async function parseAndValidateParams(paramsSchema?: z.ZodSchema, context?: any) {
	if (!paramsSchema) return undefined;

	const params = await context.params;
	const result = paramsSchema.safeParse(params);

	if (!result.success) {
		return InvalidParamsResponse(result.error.issues || 'Params 参数验证失败');
	}

	return result.data as any;
}

/**
 * 解析并验证查询参数（query）
 */
function parseAndValidateQuery(req: NextRequest, querySchema?: z.ZodSchema) {
	if (!querySchema) return undefined;

	const url = new URL(req.url);
	const rawQuery = Object.fromEntries(url.searchParams);
	const result = querySchema.safeParse(rawQuery);

	if (!result.success) {
		return InvalidParamsResponse(result.error.issues || 'Query 参数验证失败');
	}

	return result.data as any;
}

/**
 * 解析并验证 JSON 请求体（body）
 */
async function parseAndValidateBody(req: NextRequest, bodySchema?: z.ZodSchema) {
	if (!bodySchema) return undefined;

	const contentType = req.headers.get('content-type');
	if (!contentType?.includes('application/json')) return undefined;

	const rawBody = await req.json();
	const result = bodySchema.safeParse(rawBody);

	if (!result.success) {
		return InvalidParamsResponse(result.error.issues || 'Body 参数验证失败');
	}

	return result.data as any;
}

/**
 * 格式化 FormData 为普通对象
 */
function formatFormData(formData: FormData): Record<string, any> {
	const raw: Record<string, any> = {};

	for (const [key] of formData.entries()) {
		const allValues = formData.getAll(key);

		// 处理文件类型
		if (allValues.every((v) => v instanceof File)) {
			raw[key] = allValues.length === 1 ? allValues[0] : allValues;
			continue;
		}

		// 处理单个值
		if (allValues.length === 1) {
			const val = allValues[0];
			if (val === 'true') raw[key] = true;
			else if (val === 'false') raw[key] = false;
			else if (!isNaN(Number(val))) raw[key] = Number(val);
			else {
				try {
					raw[key] = JSON.parse(val as string);
				} catch {
					raw[key] = val;
				}
			}
		}
		// 处理多个值
		else {
			raw[key] = allValues.map((v) => {
				try {
					return JSON.parse(v as string);
				} catch {
					return v;
				}
			});
		}
	}

	return raw;
}

/**
 * 解析并验证 FormData
 */
async function parseAndValidateFormData(req: NextRequest, formDataSchema?: z.ZodSchema) {
	if (!formDataSchema) return undefined;

	const contentType = req.headers.get('content-type');
	if (!contentType?.includes('multipart/form-data')) return undefined;

	const rawFormData = await req.formData();
	const formattedData = formatFormData(rawFormData);
	const result = formDataSchema.safeParse(formattedData);

	if (!result.success) {
		return InvalidParamsResponse(result.error.issues || 'FormData 参数验证失败');
	}

	return result.data as any;
}

export function apiHandler<T extends z.ZodSchema | undefined>(config: {
	query?: T extends z.ZodSchema ? T : z.ZodSchema;
	body?: T extends z.ZodSchema ? T : z.ZodSchema;
	formData?: T extends z.ZodSchema ? T : z.ZodSchema;
	params?: any & { id: string };
	handler: (
		ctx: ApiHandlerContext & {
			query: T extends z.ZodSchema ? z.infer<T> : undefined;
			body: T extends z.ZodSchema ? z.infer<T> : undefined;
			formData: T extends z.ZodSchema ? z.infer<T> : undefined;
		}
	) => Promise<NextResponse>;
}) {
	const { query: querySchema, body: bodySchema, formData: formDataSchema, params: paramsSchema, handler } = config;

	return withAuthHandler(async (req: NextRequest, context: any, user) => {
		// 1. 解析并验证所有参数
		const parsedParams = await parseAndValidateParams(paramsSchema, context);
		const parsedQuery = parseAndValidateQuery(req, querySchema);
		const parsedBody = await parseAndValidateBody(req, bodySchema);
		const parsedFormData = await parseAndValidateFormData(req, formDataSchema);

		// 2. 调用业务处理器
		return handler({
			user,
			query: parsedQuery,
			body: parsedBody,
			formData: parsedFormData,
			params: parsedParams,
			request: req,
		});
	});
}
