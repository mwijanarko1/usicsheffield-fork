
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAdminToken } from '@/lib/firebase-admin-utils';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// PATCH /api/admin/newsletters/[newsletterId]
// Publish or unpublish a newsletter.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ newsletterId: string }> }
) {
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

    const { newsletterId } = await params;
    const body = await request.json();

    if (typeof body.published !== 'boolean') {
      return NextResponse.json(
        { error: 'Published must be true or false.' },
        { status: 400 }
      );
    }

    const newsletterRef = adminDb
      .collection('newsletters')
      .doc(newsletterId);

    const newsletter = await newsletterRef.get();

    if (!newsletter.exists) {
      return NextResponse.json(
        { error: 'Newsletter not found.' },
        { status: 404 }
      );
    }

    await newsletterRef.update({
      published: body.published,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      message: body.published
        ? 'Newsletter published successfully.'
        : 'Newsletter unpublished successfully.',
    });
  } catch (error) {
    console.error('Error updating newsletter:', error);

    return NextResponse.json(
      { error: 'Failed to update newsletter.' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/newsletters/[newsletterId]
// Permanently delete a newsletter and its PDF from Cloudinary.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ newsletterId: string }> }
) {
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

    const { newsletterId } = await params;

    const newsletterRef = adminDb
      .collection('newsletters')
      .doc(newsletterId);

    const newsletter = await newsletterRef.get();

    if (!newsletter.exists) {
      return NextResponse.json(
        { error: 'Newsletter not found.' },
        { status: 404 }
      );
    }

    const data = newsletter.data();

    if (!data?.pdfPublicId) {
      return NextResponse.json(
        { error: 'Newsletter PDF reference is missing. Cannot safely delete.' },
        { status: 500 }
      );
    }

    // Remove the PDF from Cloudinary first.
    const cloudinaryResult = await cloudinary.uploader.destroy(
      data.pdfPublicId,
      {
        resource_type: 'image',
        invalidate: true,
      }
    );

    if (
      cloudinaryResult.result !== 'ok' &&
      cloudinaryResult.result !== 'not found'
    ) {
      throw new Error(
        `Cloudinary deletion failed: ${cloudinaryResult.result}`
      );
    }

    // Only remove the Firestore record after Cloudinary deletion succeeds.
    await newsletterRef.delete();

    return NextResponse.json({
      message: 'Newsletter and PDF permanently deleted.',
    });
  } catch (error) {
    console.error('Error deleting newsletter:', error);

    return NextResponse.json(
      { error: 'Failed to delete newsletter and its PDF.' },
      { status: 500 }
    );
  }
}
