# GPS Tracker Dashboard

IoT устройство за локализация със S.O.S
---

## Използвани технологии и инструменти

- **Хардуер**  
  - Arduino Nano  
  - SIM868 GSM/GPRS/GNSS модул  
  - SOS бутон
  - DWM 1000

- **Езици и фреймуъркове**  
  - C++ (Arduino скеч)  
  - JavaScript / TypeScript (Next.js + React)  
  - SQL (PostgreSQL)  

- **База данни**  
  - PostgreSQL (v17.2)  

- **Сървър и бекенд**  
  - Next.js (App Router)  
  - Node.js  
  - `pg` (node-postgres) за връзка с PostgreSQL  
  - `mqtt.js` за MQTT интеграция  

- **Фронтенд**  
  - React (вградено в Next.js)  
  - Google Maps JavaScript API  
  - Tailwind CSS за базова стилизация  

- **Реално-време**  
  - MQTT протокол, публичен брокер HiveMQ (wss://broker.hivemq.com:8884/mqtt)  

- **Тунелиране / DevOps**  
  - ngrok v3 (HTTP тунел, TCP тунел)  

---

## Предварителни условия

1. **Arduino IDE** (или друг инструмент за качване на Arduino скеч)  
2. **Node.js & npm**  
3. **PostgreSQL** (локална инсталация или изнесена чрез ngrok)  
4. **ngrok v3** (регистриран акаунт за резервация на субдомейн)  
5. **Google Maps API ключ**  

---
---

## Конфигурация на база данни (PostgreSQL)

1. Създайте база данни `gps_tracker`:
   ```sql
   CREATE DATABASE gps_tracker;

    CREATE TABLE locations (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE notifications (
      id SERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE uwb_readings (
      id SERIAL PRIMARY KEY,
      device_id VARCHAR(50) NOT NULL,
      x DOUBLE PRECISION NOT NULL,
      y DOUBLE PRECISION NOT NULL,
      timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
## Геозона (Geofence) – проверка на GPS координати
   
    export function isInsideGeofence(
      latitude: number,
      longitude: number,
      centerLat = 42.6977,
      centerLon = 23.3219,
      radiusKm = 1
    ): boolean {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 6371; // Земен радиус в километри
  
    const dLat = toRad(centerLat - latitude);
    const dLon = toRad(centerLon - longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(latitude)) *
        Math.cos(toRad(centerLat)) *
        Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return distance <= radiusKm;
  }

**Входни параметри**

-	**latitude, longitude** – GPS координатите на устройството.
-	**centerLat = 42.6977, centerLon = 23.3219** – координатите на центъра на геозоната (по подразбиране София).
- **radiusKm = 1**– радиусът на геозоната в километри (по подразбиране 1 км).
- **Изчисление:**
1.	Преобразуваме ширина и дължина в радиани чрез toRad.
2.	Пресмятаме разликата на ширини dLat = toRad(centerLat – latitude) и дължини dLon = toRad(centerLon – longitude).
3.	Прилагаме Haversine формулата:
 
            a = sin²(dLat/2) 
              + cos(toRad(latitude)) 
              * cos(toRad(centerLat)) 
              * sin²(dLon/2)
          
            distance = R * 2 * atan2(√a, √(1 – a))

  където R = 6371 км е земният радиус.

   4.	Ако distance ≤ radiusKm, функцията връща true (т.е. точката е вътре в геозоната). В противен случай връща false.
