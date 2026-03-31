import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error']
    });
  }
  return prisma;
}

export async function GET() {
  try {
    const db = getPrisma();
    const worklogEntries = await db.worklogEntry.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    return NextResponse.json({ entries: worklogEntries });
  } catch (error: any) {
    console.error('Failed to fetch worklog:', error?.message || error);
    // Return empty array if database not available
    if (error?.message?.includes('DATABASE_URL') || error?.code === 'P2002') {
      return NextResponse.json({ entries: [] });
    }
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getPrisma();
    const body = await request.json();
    const { taskId, agent, taskName, stage, status, description, duration } = body;

    const entry = await db.worklogEntry.upsert({
      where: { taskId },
      update: {
        stage,
        status,
        description,
        duration,
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date()
      },
      create: {
        taskId,
        agent,
        taskName,
        stage,
        status,
        description,
        duration
      }
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('Failed to create worklog entry:', error?.message || error);
    return NextResponse.json({ entry: null });
  }
}