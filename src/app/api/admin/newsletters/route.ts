
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdminToken } from '@/lib/firebase-admin-utils';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { formFile, formText } from '@/lib/form-data';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB


// GET /api/admin/newsletters - Get all newsletters for admin management
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminToken(request);

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const snapshot = await adminDb
      .collection('newsletters')
      .orderBy('publicationDate', 'desc')
      .get();

    const newsletters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ newsletters });
  } catch (error) {
    console.error('Error fetching newsletters:', error);

    return NextResponse.json(
      { error: 'Failed to fetch newsletters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // 1. Verify that the requester is an administrator.
  const authResult = await verifyAdminToken(request);

  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  if (!adminDb) {
    return NextResponse.json(
      { error: 'Database not initialized' },
      { status: 500 }
    );
    }

  try {
    // 2. Read the submitted form.
    const formData = await request.formData();

    const title = formText(formData, 'title')?.trim();
    const academicYear = formText(formData, 'academicYear')?.trim();
    const weekNumberValue = formText(formData, 'weekNumber')?.trim();
    const publicationDate = formText(formData, 'publicationDate')?.trim();
    const description = formText(formData, 'description')?.trim() || '';

    const pdf = formFile(formData, 'pdf');

    // 3. Validate the newsletter details.
    if (!title || !academicYear || !weekNumberValue || !publicationDate || !pdf) {
      return NextResponse.json(
        { error: 'Please provide all required fields and a PDF file.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}\/\d{2}$/.test(academicYear)) {
      return NextResponse.json(
        { error: 'Academic year must look like 2026/27.' },
        { status: 400 }
      );
    }

    const weekNumber = Number(weekNumberValue);

    if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 52) {
      return NextResponse.json(
        { error: 'Week number must be between 1 and 52.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate) ||
        Number.isNaN(Date.parse(publicationDate))) {
      return NextResponse.json(
        { error: 'Please provide a valid publication date.' },
        { status: 400 }
      );
    }

    // 4. Validate the uploaded PDF.
    if (pdf.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed.' },
        { status: 400 }
      );
    }

    if (pdf.size === 0 || pdf.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'The PDF must be smaller than 4 MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await pdf.arrayBuffer());
    const pdfSignature = buffer.subarray(0, 5).toString('ascii');

    if (pdfSignature !== '%PDF-') {
      return NextResponse.json(
        { error: 'The uploaded file does not appear to be a valid PDF.' },
        { status: 400 }
      );
    }

    // 5. Prevent duplicate editions for the same academic week.
    const existingNewsletter = await adminDb
      .collection('newsletters')
      .where('academicYear', '==', academicYear)
      .where('weekNumber', '==', weekNumber)
      .limit(1)
      .get();

    if (!existingNewsletter.empty) {
      return NextResponse.json(
        { error: 'A newsletter already exists for this academic week.' },
        { status: 409 }
      );
    }

    // 6. Upload the PDF to Cloudinary.
    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'usic-newsletters',
            resource_type: 'image',
            public_id: `newsletter_${Date.now()}`,
            overwrite: false,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Cloudinary returned no upload result.'));
            }
          }
        );

        uploadStream.end(buffer);
      }
    );

    // 7. Save the newsletter details in Firestore.
    const newsletterData = {
      title,
      academicYear,
      weekNumber,
      publicationDate,
      description,
      pdfUrl: uploadResult.secure_url,
      pdfPublicId: uploadResult.public_id,
      fileName: pdf.name,
      published: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: authResult.uid,
    };

    const document = await adminDb
      .collection('newsletters')
      .add(newsletterData);

    return NextResponse.json(
      {
        message: 'Newsletter uploaded successfully.',
        id: document.id,
        newsletter: newsletterData,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Newsletter upload error:', error);

    return NextResponse.json(
      { error: 'Something went wrong while uploading the newsletter.' },
      { status: 500 }
    );
  }
}
