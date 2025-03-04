import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for validating product term data
const productTermSchema = z.object({
  term: z.string().min(1, 'Term is required'),
  description: z.string().nullable(),
  category: z.string().nullable(),
});

export async function GET() {
  try {
    const terms = await prisma.productTerm.findMany({
      orderBy: { term: 'asc' },
    });
    
    return NextResponse.json(terms);
  } catch (error) {
    console.error('Error fetching product terms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product terms' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = productTermSchema.parse(body);
    
    // Check if term already exists
    const existingTerm = await prisma.productTerm.findUnique({
      where: { term: validatedData.term },
    });
    
    if (existingTerm) {
      return NextResponse.json(
        { error: 'Term already exists' },
        { status: 400 }
      );
    }
    
    // Create the new term
    const newTerm = await prisma.productTerm.create({
      data: validatedData,
    });
    
    return NextResponse.json(newTerm, { status: 201 });
  } catch (error) {
    console.error('Error creating product term:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create product term' },
      { status: 500 }
    );
  }
} 