// src/app/api/uwb-data/route.ts
import { NextResponse } from 'next/server';
import { Client }       from 'pg';
import 'src/lib/mqttClient';  // ensure your subscriber runs

export async function GET() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query(
    `SELECT device_id, x, y, rssi, ts
     FROM uwb_readings
     ORDER BY ts DESC
     LIMIT 50`
  );
  await client.end();
  return NextResponse.json(rows);
}
