import { Material } from '../lib/types';

const API_BASE = '/api/materials';

export async function getMaterials(): Promise<Material[]> {
	const response = await fetch(API_BASE);
	if (!response.ok) throw new Error('Failed to fetch materials');
	return response.json();
}

export async function getMaterial(id: string): Promise<Material> {
	const response = await fetch(`${API_BASE}/${id}`);
	if (!response.ok) throw new Error('Failed to fetch material');
	return response.json();
}

export async function createMaterial(data: Partial<Material>): Promise<Material> {
	const response = await fetch(API_BASE, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!response.ok) throw new Error('Failed to create material');
	return response.json();
}

export async function updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
	const response = await fetch(`${API_BASE}/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!response.ok) throw new Error('Failed to update material');
	return response.json();
}

export async function deleteMaterial(id: string): Promise<void> {
	const response = await fetch(`${API_BASE}/${id}`, {
		method: 'DELETE',
	});
	if (!response.ok) throw new Error('Failed to delete material');
}