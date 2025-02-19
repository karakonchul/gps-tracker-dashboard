import { NextResponse } from 'next/server';
import { Client } from 'pg';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('device_id');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const query = deviceId
      ? `SELECT * FROM locations WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1`
      : `SELECT device_id, latitude, longitude, timestamp FROM locations ORDER BY timestamp DESC LIMIT 1`;
    const values = deviceId ? [deviceId] : [];
    const result = await client.query(query, values);
    await client.end();
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching location data:', error);
    await client.end();
    return NextResponse.json({ error: 'Error fetching location data' }, { status: 500 });
  }
}

