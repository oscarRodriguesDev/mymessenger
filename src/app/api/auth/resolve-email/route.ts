import { NextResponse } from 'next/server';
import { userService } from '@/services';

export async function POST(request: Request) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier required' }, { status: 400 });
    }

    const isEmail = identifier.includes('@');
    const user = isEmail
      ? await userService.findByEmail(identifier)
      : await userService.findByUsername(identifier);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ email: user.email });
  } catch (error) {
    console.error('Resolve email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
