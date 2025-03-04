import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if term exists
    const term = await prisma.productTerm.findUnique({
      where: { id: params.id },
    });
    
    if (!term) {
      return NextResponse.json(
        { error: 'Product term not found' },
        { status: 404 }
      );
    }
    
    // Delete the term
    await prisma.productTerm.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product term:', error);
    return NextResponse.json(
      { error: 'Failed to delete product term' },
      { status: 500 }
    );
  }
} 