
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

interface RouteContext {
  params: Promise<{
    newsLetterId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const { newsLetterId } = await context.params;

    const doc = await adminDb
      .collection('newsletters')
      .doc(newsLetterId)
      .get();

    if (!doc.exists || doc.data()?.published !== true) {
      return NextResponse.json(
        { error: 'Newsletter not found' },
        { status: 404 }
      );
    }

    const data = doc.data()!;

    return NextResponse.json({
      newsletter: {
        id: doc.id,
        title: data.title,
        academicYear: data.academicYear,
        weekNumber: data.weekNumber,
        publicationDate: data.publicationDate,
        description: data.description || '',
        pdfUrl: data.pdfUrl,
        fileName: data.fileName,
      },
    });
  } catch (error) {
    console.error('Error fetching newsletter:', error);

    return NextResponse.json(
      { error: 'Failed to fetch newsletter' },
      { status: 500 }
    );
  }
}
