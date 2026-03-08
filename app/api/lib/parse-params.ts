import { NextRequest } from 'next/server';
import { BadRequestResponse } from './response';

export type ParamType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'stringArray';

export interface ParamSchema {
	type: ParamType;
	required?: boolean;
	default?: any;
	validator?: (value: any) => string | null;
}

export interface ParsedParams {
	[K: string]: any;
}

export const parseParams = async (
	request: NextRequest,
	schema: Record<string, ParamSchema>
): Promise<{ success: true; data: ParsedParams } | { success: false; response: ReturnType<typeof BadRequestResponse> }> => {
	const result: ParsedParams = {};
	const errors: string[] = [];

	let body: Record<string, any> = {};
	const contentType = request.headers.get('content-type');

	if (contentType?.includes('application/json')) {
		try {
			body = await request.json();
		} catch {
			body = {};
		}
	}

	for (const [key, schemaDef] of Object.entries(schema)) {
		let value: any = body[key];

		if (value === undefined || value === null) {
			const { searchParams } = new URL(request.url);
			const paramValue = searchParams.get(key);

			if (paramValue !== null) {
				value = paramValue;
			}
		}

		if (value === undefined || value === null) {
			if (schemaDef.required) {
				errors.push(`缺少必填参数: ${key}`);
				continue;
			}

			result[key] = schemaDef.default;
			continue;
		}

		let parsedValue: any;
		try {
			parsedValue = parseValue(value, schemaDef.type);
		} catch (error) {
			errors.push(`参数 ${key} 类型错误: ${error instanceof Error ? error.message : '无效值'}`);
			continue;
		}

		if (schemaDef.validator) {
			const validationError = schemaDef.validator(parsedValue);
			if (validationError) {
				errors.push(`参数 ${key} 验证失败: ${validationError}`);
				continue;
			}
		}

		result[key] = parsedValue;
	}

	if (errors.length > 0) {
		return {
			success: false,
			response: BadRequestResponse(errors.join('; ')),
		};
	}

	return {
		success: true,
		data: result,
	};
};

function parseValue(value: any, type: ParamType): any {
	switch (type) {
		case 'string':
			if (typeof value === 'string') return value;
			throw new Error(`期望字符串, 实际得到 ${typeof value}`);

		case 'number':
			if (typeof value === 'number' && !isNaN(value)) return value;
			const num = Number(value);
			if (isNaN(num)) throw new Error(`无效的数字: ${value}`);
			return num;

		case 'boolean':
			if (typeof value === 'boolean') return value;
			if (value === 'true' || value === '1' || value === 1) return true;
			if (value === 'false' || value === '0' || value === 0) return false;
			throw new Error(`无效的布尔值: ${value}`);

		case 'array':
			if (Array.isArray(value)) return value;
			if (typeof value === 'string') {
				try {
					const parsed = JSON.parse(value);
					if (Array.isArray(parsed)) return parsed;
				} catch {}
			}
			throw new Error(`期望数组, 实际得到 ${typeof value}`);

		case 'stringArray':
			if (Array.isArray(value)) {
				return value.map((v) => String(v));
			}
			if (typeof value === 'string') {
				return value.split(',').map((v) => v.trim()).filter(Boolean);
			}
			throw new Error(`期望字符串数组, 实际得到 ${typeof value}`);

		case 'object':
			if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
			if (typeof value === 'string') {
				try {
					return JSON.parse(value);
				} catch {
					throw new Error(`无效的 JSON 对象: ${value}`);
				}
			}
			throw new Error(`期望对象, 实际得到 ${typeof value}`);

		default:
			return value;
	}
}

export const z = {
	string: (required = true, defaultValue?: string): ParamSchema => ({
		type: 'string',
		required,
		default: defaultValue,
	}),
	number: (required = true, defaultValue?: number): ParamSchema => ({
		type: 'number',
		required,
		default: defaultValue,
	}),
	boolean: (required = true, defaultValue?: boolean): ParamSchema => ({
		type: 'boolean',
		required,
		default: defaultValue,
	}),
	array: (required = true, defaultValue?: any[]): ParamSchema => ({
		type: 'array',
		required,
		default: defaultValue,
	}),
	stringArray: (required = true, defaultValue?: string[]): ParamSchema => ({
		type: 'stringArray',
		required,
		default: defaultValue,
	}),
	object: (required = true, defaultValue?: Record<string, any>): ParamSchema => ({
		type: 'object',
		required,
		default: defaultValue,
	}),
	optional: (schema: ParamSchema): ParamSchema => ({
		...schema,
		required: false,
	}),
};
