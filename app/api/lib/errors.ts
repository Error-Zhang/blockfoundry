export class NotFoundError extends Error {
	constructor(message = '资源不存在') {
		super(message);
		this.name = 'NotFoundError';
	}
}

export class ForbiddenError extends Error {
	constructor(message = '无权访问') {
		super(message);
		this.name = 'ForbiddenError';
	}
}

export class CustomError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CustomError';
	}
}
