import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Path provided in USER_REQUEST
        const filePath = 'c:\\Users\\DARK\\Desktop\\zugchain-configuration\\incentive-testnet-ui\\db\\backups\\backup_zugchain_2026-01-25_21-01-07\\users.csv';

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/);
        if (lines.length === 0) return NextResponse.json([]);

        const headers = lines[0].split(',').map(h => h.trim());

        const data = lines.slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                const values = line.split(',');
                const obj: Record<string, string> = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i] || '';
                });
                return obj;
            });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('CSV Parse Error:', error);
        return NextResponse.json({ error: 'Failed to process database backup' }, { status: 500 });
    }
}
