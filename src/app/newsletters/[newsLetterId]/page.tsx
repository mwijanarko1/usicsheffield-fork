import Link from 'next/link';
import { notFound } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';

interface Newsletter {
  id: string;
  title: string;
  academicYear: string;
  weekNumber: number;
  publicationDate: string;
  description?: string;
  pdfUrl: string;
  fileName: string;
}

interface PageProps {
  params: Promise<{
    newsLetterId: string;
  }>;
}

export default async function NewsletterPage({ params }: PageProps) {
  const { newsLetterId } = await params;

  if (!adminDb) {
    throw new Error('Firebase Admin database is not initialized');
  }

  let newsletter: Newsletter;

  try {
    const newsletterDoc = await adminDb
      .collection('newsletters')
      .doc(newsLetterId)
      .get();

    if (!newsletterDoc.exists) {
      notFound();
    }

    const data = newsletterDoc.data();

    if (!data || data.published !== true) {
      notFound();
    }

    newsletter = {
      id: newsletterDoc.id,
      title: data.title,
      academicYear: data.academicYear,
      weekNumber: data.weekNumber,
      publicationDate: data.publicationDate,
      description: data.description || '',
      pdfUrl: data.pdfUrl,
      fileName: data.fileName,
    };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')
    ) {
      throw error;
    }

    console.error('Newsletter page error:', error);
    throw error;
  }

  const formattedDate = new Date(
    `${newsletter.publicationDate}T00:00:00`
  ).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="min-h-screen bg-[#102d3b] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">

        {/* Back link */}
        <Link
          href="/newsletters"
          className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 mb-8"
        >
          ← Back to Newsletter Archive
        </Link>

        {/* Newsletter information */}
        <div className="mb-8">
          <p className="text-blue-300 uppercase tracking-widest text-sm font-semibold mb-3">
            USIC Sheffield · {newsletter.academicYear}
          </p>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {newsletter.title}
          </h1>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-gray-300 text-sm">
            <span>Week {newsletter.weekNumber}</span>
            <span>{formattedDate}</span>
          </div>

          {newsletter.description && (
            <p className="text-gray-300 mt-5 max-w-3xl leading-relaxed">
              {newsletter.description}
            </p>
          )}
        </div>

        {/* PDF actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <a
            href={newsletter.pdfUrl}
            download={newsletter.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            Download PDF
          </a>

          <a
            href={newsletter.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            Open PDF in New Tab
          </a>
        </div>

        {/* PDF viewer */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10">
            <h2 className="font-semibold">
              Newsletter Preview
            </h2>
          </div>

          <iframe
            src={`${newsletter.pdfUrl}#toolbar=1&navpanes=0`}
            title={newsletter.title}
            className="w-full bg-white"
            style={{ height: '85vh', minHeight: '600px' }}
          />
        </div>

        <div className="text-center mt-8">
          <Link
            href="/newsletters"
            className="text-blue-300 hover:text-blue-200"
          >
            ← Return to all newsletters
          </Link>
        </div>

      </div>
    </main>
  );
}
