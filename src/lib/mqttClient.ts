import mqtt from 'mqtt';
import { Client } from 'pg';
import { isInsideGeofence } from './geofence';

// Set up PostgreSQL client
const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});
pgClient.connect().then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// Connect to MQTT Broker
if (!process.env.MQTT_BROKER_URL) {
  throw new Error('MQTT_BROKER_URL is not defined');
}
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  // Subscribe to both location and SOS topics
  mqttClient.subscribe(['gps/+/location', 'gps/+/sos'], (err) => {
    if (err) console.error('MQTT Subscription error:', err);
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    if (topic.includes('/location')) {
      const { device_id, latitude, longitude } = data;
      const query = 'INSERT INTO locations (device_id, latitude, longitude) VALUES ($1, $2, $3)';
      await pgClient.query(query, [device_id, latitude, longitude]);
      console.log('Location saved:', data);

      // Geofencing check
      const geofenceCenter = { lat: 42.6977, lng: 23.3219 };
      const geofenceRadiusKm = 1;
      if (isInsideGeofence(parseFloat(latitude), parseFloat(longitude), geofenceCenter.lat, geofenceCenter.lng, geofenceRadiusKm)) {
        console.log(`Device ${device_id} is inside the geofence.`);
      } else {
        console.log(`Device ${device_id} is outside the geofence.`);
      }
    }

    if (topic.includes('/sos')) {
      const { lat, lng } = data;
      const device_id = topic.split('/')[1];

      const locQuery = 'INSERT INTO locations (device_id, latitude, longitude) VALUES ($1, $2, $3)';
      await pgClient.query(locQuery, [device_id, lat, lng]);
      console.log(`SOS location saved for ${device_id}`);

      const messageText = `SOS from ${device_id} at [${lat}, ${lng}]`;
      const notifQuery = 'INSERT INTO notifications (message) VALUES ($1)';
      await pgClient.query(notifQuery, [messageText]);
      console.log(`Notification saved: ${messageText}`);
    }

  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

export default mqttClient;
