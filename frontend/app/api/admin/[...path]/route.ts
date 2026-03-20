import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const ADMIN_KEY = process.env.ADMIN_KEY;

type Params = Promise<{ path: string[] }>;

async function proxyAdmin(req: NextRequest, params: Params): Promise<NextResponse> {
    const { path } = await params;
    const clientKey = req.headers.get('x-admin-key');

    // Validate the key server-side — the real ADMIN_KEY is never sent to the browser
    if (!ADMIN_KEY || clientKey !== ADMIN_KEY) {
        return NextResponse.json(
            { detail: 'Accès refusé – clé admin invalide' },
            { status: 403 }
        );
    }

    const backendPath = '/admin/' + path.join('/');
    const url = `${BACKEND_URL}${backendPath}`;

    const backendRes = await fetch(url, {
        method: req.method,
        headers: {
            'x-admin-key': ADMIN_KEY,
            'Content-Type': 'application/json',
        },
        body: req.method !== 'GET' && req.method !== 'DELETE' ? await req.text() : undefined,
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
    return proxyAdmin(req, params);
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
    return proxyAdmin(req, params);
}
