// src/app/api/telemetry/route.ts
import { NextResponse } from 'next/server'
import mqttClient from '@/lib/mqttClient'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

mqttClient.on('connect', () => {
  console.log('🔌 Connected to MQTT broker at', process.env.MQTT_BROKER_URL)
})

export async function POST(req: Request) {
  // 1) Log the exact time we got this POST
  const now = new Date().toISOString()
  console.log(`[${now}]  POST /api/telemetry`)

  try {
    const { device_id, latitude, longitude, alert } = await req.json()

    // 2) write location
    await pool.query(
      'INSERT INTO locations(device_id,latitude,longitude) VALUES($1,$2,$3)',
      [device_id, latitude, longitude]
    )

    // 3) write SOS notification if needed
    if (alert) {
      const msg = `SOS from ${device_id} at [${latitude},${longitude}]`
      await pool.query('INSERT INTO notifications(message) VALUES($1)', [msg])
    }

    // 4) publish over MQTT
    const payload = JSON.stringify({ device_id, latitude, longitude, alert })
    mqttClient.publish(`gps/${device_id}/location`, payload, { qos: 0 })
    if (alert) {
      mqttClient.publish(`gps/${device_id}/sos`, payload, { qos: 0 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/telemetry] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
