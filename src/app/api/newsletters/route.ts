
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const snapshot = await adminDb
      .collection('newsletters')
      .where('published', '==', true)
      .orderBy('publicationDate', 'desc')
      .get();

    const newsletters = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title,
        academicYear: data.academicYear,
        weekNumber: data.weekNumber,
        publicationDate: data.publicationDate,
        description: data.description || '',
        pdfUrl: data.pdfUrl,
        fileName: data.fileName,
      };
    });

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error('Error fetching public newsletters:', error);

    return NextResponse.json(
      { error: 'Failed to fetch newsletters' },
      { status: 500 }
    );
  }
}
