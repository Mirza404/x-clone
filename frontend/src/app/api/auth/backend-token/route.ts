import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/app/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: 'Authentication required' },
      { status: 401 }
    );
  }

  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    throw new Error('BACKEND_JWT_SECRET is not set');
  }

  const expiresIn = 5 * 60;
  const token = jwt.sign(
    { sub: session.user.id, email: session.user.email },
    secret,
    {
      expiresIn,
      issuer: 'x-clone-frontend',
      audience: 'x-clone-backend',
    }
  );

  return NextResponse.json({
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
}
