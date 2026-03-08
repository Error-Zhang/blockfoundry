import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/app/api/lib/auth-middleware';
import { BadRequestResponse, InvalidParamsResponse } from '@/app/api/lib/response';

export interface ApiHandlerContext {
	user: {
		id: number;
		email: string;
		name: string;
	};
	query?: Record<string, any>;
	body?: Record<string, any>;
	formData?: Record<string, any>;
	request: NextRequest;
	params?: Record<string, string>;
}

export function apiHandler<T extends z.ZodSchema | undefined>(config: {
	query?: T extends z.ZodSchema ? T : z.ZodSchema;
	body?: T extends z.ZodSchema ? T : z.ZodSchema;
	formData?: z.ZodSchema;
	params?: z.ZodSchema;
	handler: (
		ctx: ApiHandlerContext & {
			query: T extends z.ZodSchema ? z.infer<T> : undefined;
			body: T extends z.ZodSchema ? z.infer<T> : undefined;
			formData: z.ZodSchema;
			params: z.ZodSchema;
		}
	) => Promise<NextResponse>;
}) {
	const { query, body, formData: formDataSchema, params: paramsSchema, handler } = config;

	return withAuthHandler(async (req: NextRequest, context: any, user) => {
		let parsedQuery: any = undefined;
		let parsedBody: any = undefined;
		let parsedFormData: any = undefined;
		let parsedParams: any = undefined;

		if (paramsSchema) {
			const params = await context.params;
			const result = paramsSchema.safeParse(params);

			if (!result.success) {
				return InvalidParamsResponse(result.error.issues || 'Params 参数验证失败');
			}

			parsedParams = result.data;
		}

		if (query) {
			const url = new URL(req.url);
			const raw = Object.fromEntries(url.searchParams);
			const result = query.safeParse(raw);

			if (!result.success) {
				return InvalidParamsResponse(result.error.issues || 'Query 参数验证失败');
			}

			parsedQuery = result.data;
		}

		const contentType = req.headers.get('content-type');

		if (body && contentType?.includes('application/json')) {
			const json = await req.json();
			const result = body.safeParse(json);

			if (!result.success) {
				return InvalidParamsResponse(result.error.issues || 'Body 参数验证失败');
			}

			parsedBody = result.data;
		}

		if (formDataSchema && contentType?.includes('multipart/form-data')) {
			const formData = await req.formData();
			const raw: Record<string, any> = {};

			for (const [key, value] of formData.entries()) {
				const allValues = formData.getAll(key);

				if (allValues.every((v) => v instanceof File)) {
					raw[key] = allValues.length === 1 ? allValues[0] : allValues;
					continue;
				}

				if (allValues.length === 1) {
					const val = allValues[0];

					if (val === 'true') {
						raw[key] = true;
					} else if (val === 'false') {
						raw[key] = false;
					}
					else if (!isNaN(Number(val))) {
						raw[key] = Number(val);
					}
					else {
						try {
							raw[key] = JSON.parse(val as string);
						} catch {
							raw[key] = val;
						}
					}
				} else {
					raw[key] = allValues.map((v) => {
						try {
							return JSON.parse(v as string);
						} catch {
							return v;
						}
					});
				}
			}

			const result = formDataSchema.safeParse(raw);

			if (!result.success) {
				return InvalidParamsResponse(result.error.issues || 'FormData 参数验证失败');
			}

			parsedFormData = result.data;
		}

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
