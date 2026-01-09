import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const material = await prisma.material.findUnique({
			where: { id, userId: parseInt(session.user.id) },
		});

		if (!material) {
			return NextResponse.json({ error: 'Material not found' }, { status: 404 });
		}

		return NextResponse.json({
			...material,
			properties: JSON.parse(material.properties),
		});
	} catch (error) {
		console.error('Error fetching material:', error);
		return NextResponse.json({ error: 'Failed to fetch material' }, { status: 500 });
	}
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		const data = await request.json();

		const material = await prisma.material.update({
			where: { id, userId: parseInt(session.user.id) },
			data: {
				name: data.name,
				description: data.description,
				type: data.type,
				properties: JSON.stringify(data.properties || {}),
			},
		});

		return NextResponse.json({
			...material,
			properties: JSON.parse(material.properties),
		});
	} catch (error) {
		console.error('Error updating material:', error);
		return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
	}
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		await prisma.material.delete({
			where: { id, userId: parseInt(session.user.id) },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting material:', error);
		return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
	}
}