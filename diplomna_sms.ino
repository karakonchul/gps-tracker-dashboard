// ----- Include section starts here. ----- 
#include <SoftwareSerial.h>
//=============================================================================================================================================================

// ----- HAL Section starts here -----
// Define SIM868 serial connection
#define SOS_BUTTON      2

#define SOFTSERIAL_RX   9
#define SOFTSERIAL_TX   8

#define DEBUG_COMM      115200
#define SIM_COMM        9600

#define POSITION_REFRESH_RATE 10000
//=============================================================================================================================================================

// ----- Function declarations -----
String getGPSCoordinates();
void HandleWarningsEngine(String gpsData);
String sendCommand(String command, String expected, unsigned long timeout);
//=============================================================================================================================================================

// ----- Flags about communication and shit -----
unsigned char FLAG_HUMAN_PANIC = false;

unsigned char FLAG_WARNING_SMS = false;

unsigned char FLAG_WARNING_SERVER = true;

unsigned char FLAG_GPS_ENABLE = true;

unsigned char FLAG_SMS_ENABLE = true;

unsigned char FLAG_GPRS_ENABLE = false;
//=============================================================================================================================================================

// ----- SIM868 Handling functions and shit -----
SoftwareSerial sim868(SOFTSERIAL_RX, SOFTSERIAL_TX);  // RX, TX

void initSIM() {
  sim868.begin(SIM_COMM);
  Serial.println("Initializing SIM868...");
  delay(3000);
  sendCommand("AT", "OK", 2000);
}

void initGNSS() {
  if (FLAG_GPS_ENABLE == true) {
    sendCommand("AT+CGNSPWR=1", "OK", 2000);  // Enable GPS
    Serial.println("GPS Enabled ... ");
  }
  else {
    sendCommand("AT+CGNSPWR=0", "OK", 2000);  // Disable GPS
    Serial.println("GPS Disabled");
  }
}

void initSMS() {
  if (FLAG_SMS_ENABLE == true) {
    sendCommand("AT+CMGF=1", "OK", 2000);     // Set SMS mode
    Serial.println("SMS Enabled ... ");
  } else {
    sendCommand("AT+CMGF=0", "OK", 2000);
    FLAG_WARNING_SMS = false;
    Serial.println("SMS Disabled ... ");
  }
}

void initGPRS() {
  
  if (FLAG_GPRS_ENABLE == true) {
    Serial.println("GPRS Enabled ... ");
            // 1) Configure GPRS context
      sendCommand("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", "OK",1000);
      sendCommand("AT+SAPBR=3,1,\"APN\",\"internet\"", "OK",1000);

      // 2) Open bearer
      if (!sendCommand("AT+SAPBR=1,1", "OK", 10000)) {
        Serial.println(F("Failed to open bearer"));
        //return;
      }
      delay(2000);

      // 3) Query bearer to verify IP
      if (!sendCommand("AT+SAPBR=2,1", "+SAPBR: 1,1", 5000)) {
        Serial.println(F("Bearer not up, no IP"));
        //return;
      }

      // 4) Make sure no old connection is hanging
      sendCommand("AT+CIPSHUT", "SHUT OK", 8000);
      delay(1000);
  } else {
    Serial.println("GPRS Disabled ... ");
  }


}

void sendSMS(const char* number, String message) {
  sendCommand("AT+CMGS=\"" + String(number) + "\"", ">", 2000);
  sim868.print(message);
  sim868.write(26);  // Send Ctrl+Z
  Serial.print("SMS Sent: ");
  Serial.println(message);
}

void sendCoordinates(const char* server, const String& gpsData, bool alert) {
  // --- 1) Parse gpsData into latitude & longitude ---
  // gpsData looks like "Lat: 42.000000, Lon: 23.000000"
  float latitude = 0.0;
  float longitude = 0.0;
  {
    int latIndex = gpsData.indexOf("Lat: ");
    int comma   = gpsData.indexOf(',', latIndex);
    if (latIndex >= 0 && comma > latIndex) {
      latitude = gpsData.substring(latIndex + 5, comma).toFloat();
      longitude = gpsData.substring(comma + 6).toFloat();
    }
  }

  // --- 2) Build JSON payload dynamically ---
  String payload = String("{") +
    "\"device_id\":\"hristiyana\"," +
    "\"latitude\":"  + String(latitude, 6) + "," +
    "\"longitude\":" + String(longitude, 6) + "," +
    "\"alert\":"     + (alert ? "true" : "false") +
    "}";

  int bodyLen = payload.length();

  // --- 3) Start TCP on the given server:port 80 ---
  String cipstart = String("AT+CIPSTART=\"TCP\",\"") + server + String("\",80");
  if (!sendCommand(cipstart, "CONNECT OK", 10000)) {
    Serial.println("Failed to open TCP");
    return;
  }

  // --- 4) Enter data‐mode ---
  if (!sendCommand("AT+CIPSEND", ">", 5000)) {
    Serial.println("Failed to enter send mode");
    return;
  }

  // --- 5) Send HTTP POST headers + JSON + Ctrl+Z ---
  Serial.println("> [sending HTTP payload]");
  sim868.print("POST /api/telemetry HTTP/1.1\r\n");
  sim868.print(String("Host: ") + server + "\r\n");
  sim868.print("Content-Type: application/json\r\n");
  sim868.print("Content-Length: " + String(bodyLen) + "\r\n\r\n");
  sim868.print(payload);
  sim868.write(26);  // Ctrl+Z terminator

  // --- 6) (Optional) check status then dump all replies ---
  sendCommand("AT+CIPSTATUS", "OK", 5000);
  unsigned long start = millis();
  while (millis() - start < 15000) {
    if (sim868.available()) {
      Serial.write(sim868.read());
      start = millis();
    }
  }
  Serial.println("\nDone.");
}


String getGPSCoordinates() {

  String response = sendCommand("AT+CGNSINF", "+CGNSINF: ", 2000);

  if (response != "") {
    Serial.println("GPS Raw: " + response);

    int index = response.indexOf("+CGNSINF: ");
    if (index != -1) {
      response = response.substring(index + 10);
      String data[10];
      int i = 0;
      char *ptr = strtok((char*)response.c_str(), ",");
      while (ptr != NULL && i < 10) {
        data[i++] = String(ptr);
        ptr = strtok(NULL, ",");
      }

      if (data[1] == "1") {  // GPS fix OK
        return "Lat: " + data[3] + ", Lon: " + data[4];
      }
    }
  }
  return "";
}

// - Low level helper functions -
String sendCommand(String command, String expected, unsigned long timeout) {
  sim868.println(command);
  unsigned long start = millis();
  String response = "";

  while (millis() - start < timeout) {
    if (sim868.available()) {
      response += sim868.readString();
      Serial.println("Response: " + response);
      if (response.indexOf(expected) != -1) {
        return response;
      }
    }
  }
  return "";
}
//=============================================================================================================================================================

const char* phoneNumber = "+359876221008";
const char* serverIP = "3.124.142.205";

// Track button press state
bool wasPressed = false;
unsigned long lastPressedTime = 0;
const unsigned long debounceDelay = 1000; // 1 second debounce

void setup() {
  Serial.begin(DEBUG_COMM);
  pinMode(SOS_BUTTON, INPUT_PULLUP);
  pinMode(13, OUTPUT);
  digitalWrite(13, LOW);
  initSIM();
  initGNSS();
  initSMS();
  initGPRS();
  
  Serial.println("Ready.");
}

void loop() {
  String gpsData = getGPSCoordinates();
  if (gpsData == "") {
      Serial.println("No valid GPS fix. Defaulting to 360 / 360");
      gpsData = "Lat: 360.0, Lon: 360.0";
  }
  Serial.println(gpsData);
  
  bool buttonState = digitalRead(SOS_BUTTON) == LOW;
  unsigned long currentTime = millis();

  // Button just pressed
  if (buttonState && !wasPressed && (currentTime - lastPressedTime > debounceDelay)) {
    wasPressed = true;
    lastPressedTime = currentTime;

    FLAG_HUMAN_PANIC = true;
    Serial.println("SOS Button Pressed!");

  }

  // Reset state when button is released
  if (!buttonState) {
    wasPressed = false;
  }
  if (FLAG_HUMAN_PANIC == true) {
    digitalWrite(13, HIGH);
    HandleWarningsEngine(gpsData);
    delay(POSITION_REFRESH_RATE);
  } else {
    digitalWrite(13, LOW);
  }

  // Let GPS feed update
  if (sim868.available()) {
    sim868.read(); // discard incoming characters (optional, to keep buffer clean)
  }
}

void HandleWarningsEngine(String gpsData) {
  
  digitalWrite(13, LOW);
  delay(250);
  digitalWrite(13, HIGH);
  if (FLAG_WARNING_SMS == true) {
    Serial.println("Sending SMS: " + gpsData);
    sendSMS(phoneNumber, "SOS! GPS Location: " + gpsData);
  }

  if (FLAG_WARNING_SERVER == true) {
    sendCoordinates("location-gps-hristiyana.eu.ngrok.io", gpsData, FLAG_HUMAN_PANIC);
  }
  
}


