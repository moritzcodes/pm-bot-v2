// Export the database client for use across the application
import { prisma } from '@/lib/prisma';

export const db = prisma; 