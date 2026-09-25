#include <WiFi.h>
#include <PubSubClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ESP32Servo.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// --- Configurações e Pinos ---
const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "broker.hivemq.com"; // Endereço do broker MQTT; utilize "broker.hivemq.com" para testes em ambiente público
const char* deviceName = "ESP32_Irrigacao_Gabriel"; // Quando mqtt_server == "broker.hivemq.com" utilize um deviceName diferente de "ESP32" para evitar conflito no broker publico.

const int PIN_POT = 34;
const int PIN_RELE = 2;
const int PIN_SERVO = 13;

// --- Objetos ---
WiFiClient espClient;
PubSubClient client(espClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -10800, 60000);
Servo servo;
WebServer controlServer(80);
bool comandoBombaRecebido = false;

// --- 1. MÓDULO DE TEMPO E COMUNICAÇÃO ---

void getISO8601Timestamp(char* buffer) {
  time_t rawTime = (time_t)timeClient.getEpochTime();
  struct tm *ptm = localtime(&rawTime);
  sprintf(buffer, "%04d-%02d-%02dT%02d:%02d:%02dZ", 
          ptm->tm_year + 1900, ptm->tm_mon + 1, ptm->tm_mday, 
          ptm->tm_hour, ptm->tm_min, ptm->tm_sec);
}

void enviarTelemetria(float valorUmidade) {
  char timestamp[25];
  getISO8601Timestamp(timestamp);

  char msg[256];
  sprintf(msg, "{\"deviceID\":\"%s\",\"propriedade\":\"Umidade\",\"valor\":%.2f,\"statusBomba\":\"%s\",\"timestamp\":\"%s\"}", 
          deviceName, valorUmidade, statusBomba(), timestamp);

  Serial.print("Enviando: ");
  Serial.println(msg);
  client.publish("sensor/umidade", msg);
}

// --- 2. MÓDULO DE LÓGICA ---

float lerUmidade() {
  int analogRaw = analogRead(PIN_POT);
  return analogRaw / 10.0; // Sua conversão atual
}

void moverServo(int angulo) {
  servo.write(angulo);
  delay(300);
}

bool statusBomba(bool estado) {
  digitalWrite(PIN_RELE, estado ? LOW : HIGH);
  return estado;
}

char* statusBomba() {
  if (digitalRead(PIN_RELE) == LOW) return "ligado";
  else return "desligado";
}

void aplicarComandoBomba(bool ligar) {
  statusBomba(ligar);
  moverServo(ligar ? 90 : 0);
  comandoBombaRecebido = true;
}

void handleBomba() {
  StaticJsonDocument<256> payload;
  DeserializationError erro = deserializeJson(payload, controlServer.arg("plain"));

  if (erro) {
    controlServer.send(400, "application/json", "{\"erro\":\"JSON invalido\"}");
    return;
  }

  const char* deviceID = payload["deviceID"];
  if (!deviceID || String(deviceID) != String(deviceName) || !payload["ligar"].is<bool>()) {
    controlServer.send(400, "application/json", "{\"erro\":\"deviceID ou ligar invalido\"}");
    return;
  }

  bool ligar = payload["ligar"].as<bool>();
  aplicarComandoBomba(ligar);

  StaticJsonDocument<192> resposta;
  resposta["deviceID"] = deviceName;
  resposta["statusBomba"] = ligar ? "ligado" : "desligado";
  resposta["valorBruto"] = payload["valorBruto"] | -1;

  String respostaJson;
  serializeJson(resposta, respostaJson);
  controlServer.send(200, "application/json", respostaJson);
}

// --- 3. INFRAESTRUTURA (WiFi/MQTT) ---

void setup_wifi() {
  Serial.print("\nConectando WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\n WiFi OK");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Tentando MQTT...");
    if (client.connect(deviceName)) {
      Serial.println(" Conectado");
    } else {
      Serial.print(" Erro: "); Serial.println(client.state());
      delay(5000);
    }
  }
}

// --- CORE DO PROGRAMA ---

void setup() {
  Serial.begin(115200);
  setup_wifi();
  timeClient.begin();
  
  pinMode(PIN_POT, INPUT);
  pinMode(PIN_RELE, OUTPUT);
  digitalWrite(PIN_RELE, HIGH); // relé ativo em LOW

  servo.attach(PIN_SERVO);
  servo.write(0);

  client.setServer(mqtt_server, 1883);
  controlServer.on("/bomba", HTTP_POST, handleBomba);
  controlServer.begin();
  Serial.println("Servidor HTTP de controle iniciado na porta 80");
  Serial.println("No Wokwi IoT Gateway, acesse este servidor pela porta local 9080");
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
  controlServer.handleClient();
  timeClient.update();

  // Fluxo simplificado e organizado:
  float umidadeAtual = lerUmidade();
  enviarTelemetria(umidadeAtual);

  delay(5000); // Frequência de atualização
}