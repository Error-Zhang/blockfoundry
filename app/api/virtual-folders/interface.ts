export interface VirtualFolderModel {
	id: string;
	userId: number;
	name: string;
	category: string;
	parentId: string | null;
	createdAt: Date;
	updatedAt: Date;
}
