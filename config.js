// 定義全域配置物件，包含系統的連線、遊戲、記錄、UI、Arduino 和網路設定
const CONFIG = {
    // 連線設定，控制與 ESP32 的通訊行為
    CONNECTION: {
        TIMEOUT: 8000, // 連線超時時間（毫秒），超過此時間未收到回應則視為連線失敗
        MAX_RETRY_ATTEMPTS: 3, // 最大重試次數，連線失敗後嘗試重新連線的次數
        AUTO_RECONNECT: true, // 是否啟用自動重新連線，啟用後會在連線失敗時自動重試
        COMMON_IPS: [ // 常見的 ESP32 IP 地址清單，用於掃描連線
            '192.168.1.100',   // 常見的區域網路 IP
            '192.168.4.1',     // AP 模式預設 IP
            '192.168.0.100',   // 另一常見區域網路 IP
            '192.168.137.200'  // 其他可能的 IP
        ],
        RETRY_DELAY: 2000 // 重試連線的延遲時間（毫秒），每次重試間隔
    },
    // 遊戲設定，定義可用遊戲的 ID、名稱和顯示顏色
    GAMES: {
        TIC_TAC_TOE: { id: 0, name: '井字遊戲', color: '#ffc107' }, // 井字遊戲配置，ID 為 0，黃色主題
        MEMORY: { id: 1, name: '記憶遊戲', color: '#17a2b8' },      // 記憶遊戲配置，ID 為 1，青色主題
        REACTION: { id: 2, name: '反應遊戲', color: '#dc3545' }     // 反應遊戲配置，ID 為 2，紅色主題
    },
    // 日誌記錄設定，控制除錯訊息的儲存和顯示
    LOGGING: {
        MAX_LOGS: 500, // 最大日誌條目數，超過後可能清除舊日誌
        AUTO_SCROLL: true, // 是否自動滾動到最新日誌，啟用後日誌區自動捲動
        EXPORT_FORMAT: 'txt', // 日誌匯出格式，設定為純文字格式
        LOG_LEVELS: ['info', 'success', 'warning', 'error'], // 支援的日誌層級：資訊、成功、警告、錯誤
        PERFORMANCE_MONITORING: true // 是否啟用效能監控，記錄系統性能數據
    },
    // 使用者介面設定，控制網頁的動畫和顯示行為
    UI: {
        ANIMATION_DURATION: 300, // 動畫持續時間（毫秒），用於 UI 過渡效果
        TOAST_DURATION: 3000, // 提示訊息（Toast）顯示時間（毫秒）
        AUTO_HIDE_SUCCESS: true, // 是否自動隱藏成功提示訊息
        THEME: 'light' // UI 主題，設定為淺色模式
    },
    // Arduino 硬體設定，與 ESP32 的腳位和行為對應
    ARDUINO: {
        BUTTON_PINS: [16, 17, 18, 19, 21, 22], // 矩陣鍵盤腳位：行 (16, 17, 18) 和列 (19, 21, 22)
        SPECIAL_PINS: { // 特殊按鈕腳位
            reset: 27,      // Reset 按鈕腳位
            gameSelect: 32, // Game Select 按鈕腳位
            confirm: 33     // Confirm 按鈕腳位
        },
        LED_PIN: 2, // LED 腳位，用於指示 WiFi 連線狀態
        DEBOUNCE_DELAY: 50 // 按鈕去抖動延遲（毫秒），避免按鈕快速重複觸發
    },
    // 網路設定，定義 WiFi 和 AP 模式的參數
    NETWORK: {
        WIFI_SSID: "KAIYAN", // WiFi 網路名稱，與 ESP32 的連線憑證一致
        AP_SSID: "Arduino_Game_Controller", // AP 模式下的 SSID
        AP_PASSWORD: "12345678" // AP 模式的密碼
    }
};

// 支援 Node.js 環境，將 CONFIG 物件匯出為模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}