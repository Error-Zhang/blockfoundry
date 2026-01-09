import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const materials = await prisma.material.findMany({
			where: { userId: parseInt(session.user.id) },
			orderBy: { createdAt: 'desc' },
		});

		return NextResponse.json(
			materials.map((m) => ({
				...m,
				properties: JSON.parse(m.properties),
			}))
		);
	} catch (error) {
		console.error('Error fetching materials:', error);
		return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const data = await request.json();
		const material = await prisma.material.create({
			data: {
				name: data.name,
				description: data.description || '',
				type: data.type || 'standard',
				properties: JSON.stringify(data.properties || {}),
				userId: parseInt(session.user.id),
			},
		});

		return NextResponse.json({
			...material,
			properties: JSON.parse(material.properties),
		});
	} catch (error) {
		console.error('Error creating material:', error);
		return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
	}
}