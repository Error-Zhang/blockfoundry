export type ServiceResult<T = void> = 
	| { success: true; data: T }
	| { success: false; error: string };

export type PaginatedResult<T> = {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export interface IBaseRepository<T, CreateInput, UpdateInput> {
	findById(id: string): Promise<T | null>;
	findFirst(where: Record<string, any>): Promise<T | null>;
	findMany(where?: Record<string, any>): Promise<T[]>;
	create(data: CreateInput): Promise<T>;
	update(id: string, data: UpdateInput): Promise<T>;
	delete(id: string): Promise<void>;
	count(where?: Record<string, any>): Promise<number>;
}

export interface ListParams {
	page?: number;
	pageSize?: number;
	orderBy?: Record<string, 'asc' | 'desc'>;
	where?: Record<string, any>;
	include?: Record<string, any>;
}
