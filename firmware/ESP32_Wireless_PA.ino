/*
  Wireless Text-to-Speech Audio Transmission over Wi-Fi
  ESP32 receiver firmware

  Target:
    - ESP32-WROOM-32 / classic ESP32 DevKit
    - 2.4 GHz Wi-Fi
    - Backend: existing Express server in this repository
    - Audio output: GPIO25 DAC1 -> PAM8403 amplifier -> speaker

  Backend endpoints used:
    GET  /api/esp32/poll
    GET  /api/audio/<audio-id>       (audioUrl returned by poll)
    POST /api/esp32/report

  Supported audio:
    RIFF/WAVE, PCM format 1, mono, signed 16-bit samples.
    The repository's local WAV generator outputs 24 kHz mono 16-bit PCM.
    Other TTS-provider formats are rejected safely if they do not match.

  Arduino IDE libraries:
    - ESP32 board package by Espressif Systems
    - ArduinoJson (v6 or v7)

  IMPORTANT:
    - Enter your own Wi-Fi SSID/password and server LAN IP below.
    - The laptop/server and ESP32 must be on the same reachable network.
    - This is the PAM8403 + ESP32 DAC design, NOT MAX98357A/I2S.
    - Test with low amplifier volume first.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";
const char* SERVER_BASE_URL = "http://192.168.1.100:3000";

constexpr uint8_t DAC_PIN = 25;  // Classic ESP32 DAC1
constexpr uint32_t SERIAL_BAUD = 115200;
constexpr uint32_t POLL_INTERVAL_MS = 2000;
constexpr uint32_t REPORT_INTERVAL_MS = 10000;
constexpr size_t MAX_AUDIO_BYTES = 2U * 1024U * 1024U;

unsigned long lastPollMs = 0;
unsigned long lastReportMs = 0;
String lastJobId = "";

struct WavInfo {
  size_t dataOffset = 0;
  uint32_t dataBytes = 0;
  uint32_t sampleRate = 0;
  uint16_t channels = 0;
  uint16_t bitsPerSample = 0;
};

uint16_t readLE16(const uint8_t* p) {
  return (uint16_t)p[0] | ((uint16_t)p[1] << 8);
}

uint32_t readLE32(const uint8_t* p) {
  return (uint32_t)p[0] |
         ((uint32_t)p[1] << 8) |
         ((uint32_t)p[2] << 16) |
         ((uint32_t)p[3] << 24);
}

bool parsePcmWav(const uint8_t* bytes, size_t length, WavInfo& info) {
  if (length < 44 ||
      memcmp(bytes, "RIFF", 4) != 0 ||
      memcmp(bytes + 8, "WAVE", 4) != 0) {
    Serial.println("[WAV] Invalid RIFF/WAVE header.");
    return false;
  }

  bool fmtFound = false;
  bool dataFound = false;
  uint16_t audioFormat = 0;
  size_t position = 12;

  while (position + 8 <= length) {
    const uint8_t* chunk = bytes + position;
    const uint32_t chunkSize = readLE32(chunk + 4);
    const size_t payload = position + 8;

    if (chunkSize > length - payload) {
      Serial.println("[WAV] Chunk extends beyond downloaded file.");
      return false;
    }

    if (memcmp(chunk, "fmt ", 4) == 0) {
      if (chunkSize < 16) return false;

      audioFormat = readLE16(bytes + payload);
      info.channels = readLE16(bytes + payload + 2);
      info.sampleRate = readLE32(bytes + payload + 4);
      info.bitsPerSample = readLE16(bytes + payload + 14);
      fmtFound = true;
    } else if (memcmp(chunk, "data", 4) == 0) {
      info.dataOffset = payload;
      info.dataBytes = chunkSize;
      dataFound = true;
    }

    // WAV chunks are word-aligned; skip optional padding byte.
    position = payload + chunkSize + (chunkSize & 1U);
  }

  if (!fmtFound || !dataFound || audioFormat != 1 ||
      info.channels != 1 || info.bitsPerSample != 16 ||
      info.sampleRate < 8000 || info.sampleRate > 48000) {
    Serial.println("[WAV] Unsupported format. Need mono 16-bit PCM, 8-48 kHz.");
    return false;
  }

  if (info.dataOffset + info.dataBytes > length) return false;

  Serial.printf("[WAV] PCM mono, %lu Hz, %lu bytes\n",
                (unsigned long)info.sampleRate,
                (unsigned long)info.dataBytes);
  return true;
}

void playPcmWav(const uint8_t* bytes, size_t length) {
  WavInfo info;
  if (!parsePcmWav(bytes, length, info)) {
    dacWrite(DAC_PIN, 128);
    return;
  }

  const uint32_t samplePeriodUs = 1000000UL / info.sampleRate;
  uint32_t nextSampleUs = micros();

  for (size_t i = 0; i + 1 < info.dataBytes; i += 2) {
    const int16_t sample =
      (int16_t)readLE16(bytes + info.dataOffset + i);

    // Convert signed 16-bit PCM (-32768..32767) to unsigned 8-bit DAC.
    const uint8_t dacValue =
      (uint8_t)(((int32_t)sample + 32768) >> 8);

    dacWrite(DAC_PIN, dacValue);

    nextSampleUs += samplePeriodUs;
    while ((int32_t)(micros() - nextSampleUs) < 0) {
      delayMicroseconds(1);
    }
  }

  dacWrite(DAC_PIN, 128);
  Serial.println("[AUDIO] Playback finished.");
}

bool downloadAudioAndPlay(const String& audioPath) {
  String url = audioPath;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (!url.startsWith("/")) url = "/" + url;
    url = String(SERVER_BASE_URL) + url;
  }

  WiFiClient client;
  HTTPClient http;
  http.setConnectTimeout(8000);
  http.setTimeout(20000);

  Serial.printf("[HTTP] Downloading %s\n", url.c_str());

  if (!http.begin(client, url)) {
    Serial.println("[HTTP] Could not initialize audio request.");
    return false;
  }

  const int statusCode = http.GET();
  if (statusCode != HTTP_CODE_OK) {
    Serial.printf("[HTTP] Audio request failed: %d\n", statusCode);
    http.end();
    return false;
  }

  const int contentLength = http.getSize();
  if (contentLength < 44 ||
      (size_t)contentLength > MAX_AUDIO_BYTES) {
    Serial.printf("[HTTP] Invalid audio length: %d\n", contentLength);
    http.end();
    return false;
  }

  uint8_t* audioBuffer = (uint8_t*)malloc((size_t)contentLength);
  if (audioBuffer == nullptr) {
    Serial.println("[MEM] Audio buffer allocation failed.");
    http.end();
    return false;
  }

  WiFiClient* stream = http.getStreamPtr();
  size_t received = 0;
  const unsigned long startMs = millis();

  while (received < (size_t)contentLength &&
         millis() - startMs < 25000) {
    const int availableBytes = stream->available();

    if (availableBytes > 0) {
      size_t toRead = (size_t)availableBytes;
      const size_t remaining = (size_t)contentLength - received;
      if (toRead > remaining) toRead = remaining;

      const size_t count =
        stream->readBytes(audioBuffer + received, toRead);
      received += count;
    } else {
      delay(2);
    }

    if (!http.connected() && stream->available() == 0 &&
        received < (size_t)contentLength) {
      break;
    }
  }

  http.end();

  bool success = false;
  if (received == (size_t)contentLength) {
    playPcmWav(audioBuffer, received);
    success = true;
  } else {
    Serial.printf("[HTTP] Incomplete download: %u of %d bytes\n",
                  (unsigned)received, contentLength);
  }

  free(audioBuffer);
  return success;
}

void postReceiverStatus(const char* status) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;
  const String url = String(SERVER_BASE_URL) + "/api/esp32/report";

  if (!http.begin(client, url)) return;

  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<192> doc;
  doc["rssi"] = WiFi.RSSI();
  doc["status"] = status;

  String body;
  serializeJson(doc, body);

  const int result = http.POST(body);
  Serial.printf("[REPORT] HTTP %d | RSSI %d dBm | %s\n",
                result, WiFi.RSSI(), status);
  http.end();
}

void pollAnnouncementQueue() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;
  const String url = String(SERVER_BASE_URL) + "/api/esp32/poll";

  http.setConnectTimeout(5000);
  http.setTimeout(5000);

  if (!http.begin(client, url)) {
    Serial.println("[POLL] Could not initialize request.");
    return;
  }

  const int statusCode = http.GET();

  if (statusCode != HTTP_CODE_OK) {
    Serial.printf("[POLL] Server returned HTTP %d\n", statusCode);
    http.end();
    return;
  }

  const String response = http.getString();
  http.end();

  StaticJsonDocument<768> doc;
  const DeserializationError jsonError = deserializeJson(doc, response);

  if (jsonError) {
    Serial.printf("[POLL] JSON error: %s\n", jsonError.c_str());
    return;
  }

  const char* command = doc["command"] | "IDLE";

  if (strcmp(command, "IDLE") == 0) {
    // Allow the same announcement ID to be accepted if it is queued again later.
    lastJobId = "";
    return;
  }

  if (strcmp(command, "STREAM") != 0) return;

  const char* jobIdValue = doc["jobId"] | "";
  const char* audioUrlValue = doc["audioUrl"] | "";

  const String jobId = String(jobIdValue);
  const String audioUrl = String(audioUrlValue);

  if (jobId.isEmpty() || audioUrl.isEmpty() || audioUrl == "null") {
    Serial.println("[POLL] STREAM command missing jobId/audioUrl.");
    return;
  }

  if (jobId == lastJobId) return;

  Serial.printf("[QUEUE] New job: %s\n", jobId.c_str());
  postReceiverStatus("STREAMING");

  const bool played = downloadAudioAndPlay(audioUrl);
  if (played) {
    lastJobId = jobId;
    postReceiverStatus("ONLINE");
  } else {
    postReceiverStatus("ERROR");
  }
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("[Wi-Fi] Connecting to %s", WIFI_SSID);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - startedAt < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[Wi-Fi] Connected. IP: %s\n",
                  WiFi.localIP().toString().c_str());
    Serial.printf("[Wi-Fi] RSSI: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("[Wi-Fi] Connection timeout.");
  }
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(300);

  dacWrite(DAC_PIN, 128);

  Serial.println();
  Serial.println("ESP32 Wi-Fi TTS Receiver");
  Serial.println("Audio output: GPIO25 DAC -> PAM8403 -> speaker");

  connectToWiFi();
  postReceiverStatus("ONLINE");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Wi-Fi] Disconnected. Reconnecting...");
    connectToWiFi();
    delay(500);
    return;
  }

  const unsigned long now = millis();

  if (now - lastPollMs >= POLL_INTERVAL_MS) {
    lastPollMs = now;
    pollAnnouncementQueue();
  }

  if (now - lastReportMs >= REPORT_INTERVAL_MS) {
    lastReportMs = now;
    postReceiverStatus("ONLINE");
  }

  delay(5);
}
