#include <WebServer.h> // 引入 WebServer 函式庫，用於建立 HTTP 伺服器
#include <WiFi.h>      // 引入 WiFi 函式庫，用於 ESP32 的無線網路連線

// WiFi 連線憑證
const char *ssid = "KAIYAN";        // WiFi 網路名稱
const char *password = "k86840071"; // WiFi 密碼

WebServer server(80); // 建立 WebServer 物件，監聽 HTTP 80 端口

// 腳位定義 - 3x3 矩陣鍵盤
const int rowPins[3] = {16, 17, 18};     // 行腳位，連接到矩陣鍵盤的行線
const int colPins[3] = {19, 21, 22};     // 列腳位，連接到矩陣鍵盤的列線
const int specialPins[3] = {27, 32, 33}; // 特殊按鈕腳位：Reset, Game Select, Confirm
const int ledPin = 2;                    // 內建 LED 腳位，用於指示 WiFi 連線狀態

// 遊戲狀態結構體，儲存按鈕狀態和遊戲資訊
struct {
  bool buttons[12] = {false};             // 按鈕狀態陣列：0-8 為矩陣鍵盤，9-11 為特殊按鈕
  unsigned long debounceTime[12] = {0};   // 按鈕去抖動時間戳記
  bool buttonPressed[12] = {false};       // 按鈕按下標記，用於短暫記錄按下事件
  unsigned long pressTime[12] = {0};      // 按鈕按下時間戳記，用於清除過期記錄
  int currentGame = 0;                    // 當前遊戲 ID：0=井字遊戲，1=記憶遊戲，2=反應遊戲
  bool webConnected = false;              // 網頁是否連接到 ESP32
  unsigned long lastInputRequest = 0;     // 上次輸入請求的時間戳記
  unsigned long connectionStartTime = 0;  // 網頁連線開始的時間戳記
} gameState;

// 初始化函數，執行於 ESP32 啟動時
void setup() {
  Serial.begin(115200); // 初始化序列埠，波特率 115200，用於除錯輸出
  delay(2000);          // 延遲 2 秒，確保序列埠穩定

  // 顯示啟動訊息
  Serial.println("=================================");
  Serial.println("Arduino Game Controller Starting");
  Serial.println("=================================");

  setupPins();   // 初始化硬體腳位
  setupWiFi();   // 設定 WiFi 連線
  setupServer(); // 設定 Web 伺服器

  // 顯示系統準備完成訊息
  Serial.println("=================================");
  Serial.println("系統準備完成!");
  if (WiFi.status() == WL_CONNECTED) {
    // 若 WiFi 連線成功，顯示本地 IP 地址
    Serial.print("★★★ 網頁連接地址: http://");
    Serial.println(WiFi.localIP());
    Serial.println("請在網頁中輸入上述 IP 地址");
  } else {
    // 若 WiFi 連線失敗，顯示 AP 模式 IP 地址
    Serial.print("★★★ AP 模式地址: http://");
    Serial.println(WiFi.softAPIP());
  }
  Serial.println("=================================");
}

// 初始化硬體腳位
void setupPins() {
  pinMode(ledPin, OUTPUT);    // 設定 LED 腳位為輸出模式
  digitalWrite(ledPin, LOW);  // 初始關閉 LED

  // 設定行腳位為輸入模式，啟用內建上拉電阻
  for (int i = 0; i < 3; i++) {
    pinMode(rowPins[i], INPUT_PULLUP);
  }

  // 設定列腳位為輸出模式，初始為高電平
  for (int i = 0; i < 3; i++) {
    pinMode(colPins[i], OUTPUT);
    digitalWrite(colPins[i], HIGH);
  }

  // 設定特殊按鈕腳位為輸入模式，啟用內建上拉電阻
  for (int i = 0; i < 3; i++) {
    pinMode(specialPins[i], INPUT_PULLUP);
  }

  Serial.println("腳位初始化完成"); // 顯示腳位設定完成訊息
}

// 設定 WiFi 連線
void setupWiFi() {
  Serial.println("正在連接 WiFi..."); // 顯示連線提示
  WiFi.mode(WIFI_STA);                // 設定為站點模式 (STA)
  WiFi.begin(ssid, password);         // 開始連接到指定 WiFi 網路

  int attempts = 0; // 連線嘗試計數器
  // 等待連線，最多嘗試 30 次，每次延遲 500ms
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print("."); // 顯示連線進度
    attempts++;
  }
  Serial.println(); // 換行

  if (WiFi.status() == WL_CONNECTED) {
    // WiFi 連線成功
    Serial.println("WiFi 連接成功");
    Serial.print("IP 地址: ");
    Serial.println(WiFi.localIP()); // 顯示分配的 IP 地址
    digitalWrite(ledPin, HIGH);     // 點亮 LED 表示連線成功
  } else {
    // WiFi 連線失敗，啟動 AP 模式
    Serial.println("WiFi 連接失敗，啟動 AP 模式");
    WiFi.mode(WIFI_AP); // 切換到接入點模式 (AP)
    WiFi.softAP("Arduino_Game_Controller", "12345678"); // 建立 AP，名稱和密碼
    Serial.print("AP IP 地址: ");
    Serial.println(WiFi.softAPIP()); // 顯示 AP 的 IP 地址
  }
}

// 設定 Web 伺服器及其路由
void setupServer() {
  Serial.println("設定 Web 伺服器..."); // 顯示伺服器設定提示

  // 定義 CORS 頭函數，允許跨域請求
  auto handleCORS = []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");        // 允許所有來源
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"); // 允許的 HTTP 方法
    server.sendHeader("Access-Control-Allow-Headers", "*");       // 允許所有頭部
    server.sendHeader("Access-Control-Max-Age", "86400");         // 快取時間
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // 禁用快取
    server.sendHeader("Pragma", "no-cache");                     // 禁用快取
    server.sendHeader("Expires", "0");                           // 立即過期
  };

  // 處理根路徑的 OPTIONS 請求
  server.on("/", HTTP_OPTIONS, [handleCORS]() {
    handleCORS();
    server.send(200, "text/plain", "OK"); // 回應成功
    Serial.println("OPTIONS 請求 - 根路徑"); // 記錄日誌
  });

  // 處理 /input 路徑的 OPTIONS 請求
  server.on("/input", HTTP_OPTIONS, [handleCORS]() {
    handleCORS();
    server.send(200, "text/plain", "OK"); // 回應成功
    Serial.println("OPTIONS 請求 - /input"); // 記錄日誌
  });

  // 處理根路徑的 GET 請求
  server.on("/", HTTP_GET, [handleCORS]() {
    handleCORS();
    gameState.webConnected = true;              // 標記網頁已連線
    gameState.connectionStartTime = millis();  // 記錄連線時間
    Serial.println("★ 網頁連接請求成功！");     // 記錄日誌
    String response = "Arduino Game Controller Ready"; // 回應訊息
    server.send(200, "text/plain", response);  // 發送回應
    Serial.println("已發送連接確認回應");       // 記錄日誌
  });

  // 處理 /input 路徑的 GET 請求
  server.on("/input", HTTP_GET, [handleCORS]() {
    handleCORS();
    handleInput(); // 處理輸入並回傳 JSON
  });

  // 處理未找到的路徑
  server.onNotFound([handleCORS]() {
    if (server.method() == HTTP_OPTIONS) {
      // 處理未知路徑的 OPTIONS 請求
      handleCORS();
      server.send(200, "text/plain", "OK");
      Serial.println("OPTIONS 請求 - 未知路徑"); // 記錄日誌
    } else {
      // 處理其他未找到的請求
      handleCORS();
      String message = "路徑未找到: " + server.uri();
      server.send(404, "text/plain", message); // 回傳 404 錯誤
      Serial.println("404: " + server.uri()); // 記錄日誌
    }
  });

  server.begin(); // 啟動 Web 伺服器
  Serial.println("Web 伺服器已啟動"); // 顯示伺服器啟動訊息
}

// 更新按鈕狀態，掃描矩陣鍵盤和特殊按鈕
void updateButtons() {
  // 掃描 3x3 矩陣鍵盤
  for (int col = 0; col < 3; col++) {
    // 將當前列設為 LOW，其他列為 HIGH
    for (int c = 0; c < 3; c++) {
      digitalWrite(colPins[c], c == col ? LOW : HIGH);
    }

    // 讀取每行狀態
    for (int row = 0; row < 3; row++) {
      int buttonIndex = row * 3 + col; // 計算按鈕索引 (0-8)
      bool currentState = !digitalRead(rowPins[row]); // LOW 表示按下
      // 檢查狀態是否改變
      if (currentState != gameState.buttons[buttonIndex]) {
        // 去抖動處理，確保間隔超過 50ms
        if (millis() - gameState.debounceTime[buttonIndex] > 50) {
          gameState.buttons[buttonIndex] = currentState; // 更新按鈕狀態
          gameState.debounceTime[buttonIndex] = millis(); // 更新時間戳記
          if (currentState) {
            // 按鈕按下事件
            Serial.print("按鈕 ");
            Serial.print(buttonIndex + 1);
            Serial.println(" 按下"); // 記錄日誌
            gameState.buttonPressed[buttonIndex] = true; // 標記按下
            gameState.pressTime[buttonIndex] = millis(); // 記錄按下時間
          }
        }
      }
    }
  }

  // 檢查特殊按鈕 (Reset, Game Select, Confirm)
  for (int i = 0; i < 3; i++) {
    bool currentState = !digitalRead(specialPins[i]); // LOW 表示按下
    int buttonIndex = 9 + i; // 特殊按鈕索引 (9-11)
    // 檢查狀態是否改變
    if (currentState != gameState.buttons[buttonIndex]) {
      // 去抖動處理
      if (millis() - gameState.debounceTime[buttonIndex] > 50) {
        gameState.buttons[buttonIndex] = currentState; // 更新按鈕狀態
        gameState.debounceTime[buttonIndex] = millis(); // 更新時間戳記
        if (currentState) {
          // 特殊按鈕按下事件
          String names[3] = {"Reset", "Game Select", "Confirm"};
          Serial.println(names[i] + " 按下"); // 記錄日誌
          gameState.buttonPressed[buttonIndex] = true; // 標記按下
          gameState.pressTime[buttonIndex] = millis(); // 記錄按下時間
          // 遊戲選擇邏輯
          if (i == 1) { // Game Select 按鈕
            gameState.currentGame = (gameState.currentGame + 1) % 3; // 循環切換 3 款遊戲
            String gameNames[3] = {"井字遊戲", "記憶遊戲", "反應遊戲"};
            Serial.print("切換到: ");
            Serial.println(gameNames[gameState.currentGame]); // 顯示當前遊戲
          }
        }
      }
    }
  }

  // 清除過期的按鈕按下記錄
  for (int i = 0; i < 12; i++) {
    if (gameState.buttonPressed[i] && millis() - gameState.pressTime[i] > 500) {
      gameState.buttonPressed[i] = false; // 清除超過 500ms 的記錄
    }
  }
}

// 處理輸入請求，回傳按鈕狀態和遊戲資訊的 JSON
void handleInput() {
  updateButtons(); // 先更新按鈕狀態

  // 構建 JSON 回應
  String json = "{\"buttons\":["; // 開始按鈕陣列
  for (int i = 0; i < 9; i++) {
    // 按鈕狀態為當前狀態或短暫按下標記
    bool buttonState = gameState.buttons[i] || gameState.buttonPressed[i];
    json += buttonState ? "true" : "false";
    if (i < 8) json += ","; // 添加逗號分隔
  }
  json += "],\"reset\":"; // Reset 按鈕狀態
  json += (gameState.buttons[9] || gameState.buttonPressed[9]) ? "true" : "false";
  json += ",\"gameSelect\":"; // Game Select 按鈕狀態
  json += (gameState.buttons[10] || gameState.buttonPressed[10]) ? "true" : "false";
  json += ",\"confirm\":"; // Confirm 按鈕狀態
  json += (gameState.buttons[11] || gameState.buttonPressed[11]) ? "true" : "false";
  json += ",\"currentGame\":"; // 當前遊戲 ID
  json += String(gameState.currentGame);
  json += ",\"uptime\":"; // 系統運行時間
  json += String(millis());
  json += "}";

  // 發送 JSON 回應
  server.send(200, "application/json", json);
  gameState.lastInputRequest = millis(); // 更新最後請求時間
}

// 主循環函數，持續執行
void loop() {
  server.handleClient(); // 處理 Web 伺服器請求
  updateButtons();      // 更新按鈕狀態

  // 每 5 秒檢查 WiFi 連線狀態
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 5000) {
    lastWiFiCheck = millis();
    // 若已連線但 WiFi 斷開，嘗試重新連線
    if (WiFi.status() != WL_CONNECTED && gameState.webConnected) {
      Serial.println("WiFi 連接丟失，嘗試重新連接...");
      gameState.webConnected = false; // 標記斷線
      digitalWrite(ledPin, LOW);      // 關閉 LED
      WiFi.begin(ssid, password);     // 重新連線
      int attempts = 0;
      // 嘗試重新連線，最多 10 次
      while (WiFi.status() != WL_CONNECTED && attempts < 10) {
        delay(500);
        Serial.print("."); // 顯示進度
        attempts++;
      }
      if (WiFi.status() == WL_CONNECTED) {
        // 重新連線成功
        Serial.println("\nWiFi 重新連接成功");
        digitalWrite(ledPin, HIGH); // 點亮 LED
      } else {
        // 重新連線失敗
        Serial.println("\nWiFi 重新連接失敗");
      }
    }
  }

  // 檢查網頁連線超時
  if (gameState.webConnected && millis() - gameState.lastInputRequest > 30000) {
    Serial.println("長時間沒有收到請求，可能網頁連接已斷開");
    gameState.webConnected = false; // 標記斷線
  }

  delay(10); // 短暫延遲，減少 CPU 負載
}