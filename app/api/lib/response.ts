import { NextResponse } from 'next/server';

export const NotFoundResponse = (message: string = '资源不存在') => 
	NextResponse.json({ success: false, error: message }, { status: 404 });

export const ErrorResponse = (message: string, status: number = 400) => 
	NextResponse.json({ success: false, error: message }, { status });

export const SuccessResponse = (data: any, status: number = 200) => 
	NextResponse.json({ success: true, data }, { status });

export const BadRequestResponse = (message: string) => 
	NextResponse.json({ success: false, error: message }, { status: 400 });

export const InvalidParamsResponse = (data: any) =>
	NextResponse.json({ success: false, error: '参数格式错误', data }, { status: 405 });

export const UnauthorizedResponse = (message: string = '未授权') => 
	NextResponse.json({ success: false, error: message }, { status: 401 });

export const ForbiddenResponse = (message: string = '禁止访问') => 
	NextResponse.json({ success: false, error: message }, { status: 403 });

export const ConflictResponse = (message: string) => 
	NextResponse.json({ success: false, error: message }, { status: 409 });

export const ServerErrorResponse = (message: string = '服务器错误') => 
	NextResponse.json({ success: false, error: message }, { status: 500 });

export const FileResponse = (buffer: Buffer, headers: HeadersInit | undefined) =>
	new NextResponse(buffer as any, {
		headers,
	});

export const ZipResponse = (buffer: Buffer, fileName:string) =>
	FileResponse(buffer, {
		'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
		'Content-Type': 'application/zip',
	});