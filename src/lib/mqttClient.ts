// src/lib/mqttClient.ts
import mqtt from 'mqtt';
import { Client } from 'pg';
import { isInsideGeofence } from './geofence';

// 1) Set up PostgreSQL client
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
pgClient.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// 2) Connect to MQTT Broker
if (!process.env.MQTT_BROKER_URL) {
  throw new Error('MQTT_BROKER_URL is not defined');
}
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  // Subscribe to GPS+SOS topics *and* UWB readings
  mqttClient.subscribe(
    ['gps/+/location', 'gps/+/sos', 'uwb/+/reading'],
    err => {
      if (err) console.error('MQTT Subscription error:', err);
    }
  );
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    // ── 3a) GPS location & SOS ──────────────────────────────────────
    if (topic.includes('/location') || topic.includes('/sos')) {
      // parse coords + alert
      const latitude  = data.latitude  != null ? parseFloat(data.latitude)  : null;
      const longitude = data.longitude != null ? parseFloat(data.longitude) : null;
      const alert     = data.alert     === true;

      if (latitude == null || longitude == null) {
        console.error(`Missing coords on "${topic}":`, data);
        return;
      }

      // determine device_id
      let device_id: string;
      if (topic.endsWith('/location')) {
        device_id = data.device_id;
      } else { // gps/+/sos
        device_id = topic.split('/')[1];
      }

      // insert into locations
      const locQuery = `
        INSERT INTO locations (device_id, latitude, longitude)
        VALUES ($1, $2, $3)
      `;
      await pgClient.query(locQuery, [device_id, latitude, longitude]);
      console.log(`${topic.includes('/sos') ? 'SOS' : 'Location'} saved:`, {
        device_id, latitude, longitude, alert
      });

      if (topic.endsWith('/location')) {
        // geofence check
        const geofenceCenter = { lat: 42.6977, lng: 23.3219 };
        const inside = isInsideGeofence(
          latitude, longitude,
          geofenceCenter.lat, geofenceCenter.lng,
          1 /*km*/
        );
        console.log(`→ Geofence: ${inside ? 'inside' : 'outside'}`);
      } else {
        // SOS notification
        const messageText = `SOS from ${device_id} at [${latitude}, ${longitude}]`;
        await pgClient.query(
          'INSERT INTO notifications (message) VALUES ($1)',
          [messageText]
        );
        console.log(`Notification saved: ${messageText}`);
      }

    // ── 3b) UWB readings ────────────────────────────────────────────
    } else if (topic.includes('/reading')) {
      // expected payload: { device_id, x, y, rssi?, ts? }
      const device_id = data.device_id || topic.split('/')[1];
      const x         = parseFloat(data.x);
      const y         = parseFloat(data.y);
      const rssi      = data.rssi != null ? parseFloat(data.rssi) : null;
      // timestamp in ms since epoch, or fallback to now()
      const tsMs      = data.ts != null ? Number(data.ts) : Date.now();

      if (isNaN(x) || isNaN(y)) {
        console.error(`Invalid UWB coords on "${topic}":`, data);
        return;
      }

      const uwbQuery = `
        INSERT INTO uwb_readings
          (device_id, x, y, rssi, ts)
        VALUES
          ($1, $2, $3, $4, to_timestamp($5/1000.0))
      `;
      await pgClient.query(uwbQuery, [device_id, x, y, rssi, tsMs]);
      console.log(`UWB reading saved: ${device_id} @ (${x},${y}) rssi=${rssi}`);
    }

    else {
      console.warn('Unhandled topic:', topic);
    }
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

export default mqttClient;
