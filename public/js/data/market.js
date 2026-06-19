export const ASSETS = [
    { ticker: "SPY (S&P 500)", tipo: "ETF CEDEAR", precio: 12000, delta: 0, pesoRiesgo: 2 },
    { ticker: "QQQ (Nasdaq)", tipo: "ETF CEDEAR", precio: 15000, delta: 0, pesoRiesgo: 3 },
    { ticker: "GOOGL (Google)", tipo: "CEDEAR Tech", precio: 8000, delta: 0, pesoRiesgo: 3 },
    { ticker: "MSFT (Microsoft)", tipo: "CEDEAR Tech", precio: 16000, delta: 0, pesoRiesgo: 3 },
    { ticker: "MELI (Mercado Libre)", tipo: "CEDEAR Latam", precio: 25000, delta: 0, pesoRiesgo: 4 },
    { ticker: "VIST (Vista Energy)", tipo: "CEDEAR O&G", precio: 11000, delta: 0, pesoRiesgo: 4 },
    { ticker: "YMCXO (YPF ON)", tipo: "ON Dólar Cable", precio: 5000, delta: 0, pesoRiesgo: 1 }
];

export const NEWS = [
    { id: 1, text: "⚠️ TENSIONES GEOPOLÍTICAS: Conflicto armado en Medio Oriente bloquea refinerías.", impacto: { "VIST (Vista Energy)": 20, "SPY (S&P 500)": -6, "QQQ (Nasdaq)": -8, "GOOGL (Google)": -4 } },
    { id: 2, text: "📊 BALANCES TECH: Microsoft ($MSFT) reporta ingresos por Inteligencia Artificial un 40% arriba.", impacto: { "MSFT (Microsoft)": 15, "QQQ (Nasdaq)": 7, "GOOGL (Google)": 4 } },
    { id: 3, text: "💸 DATO INFLACIÓN ARG: El IPC sale más bajo de lo previsto. Sube el consumo local.", impacto: { "MELI (Mercado Libre)": 14, "YMCXO (YPF ON)": 2 } },
    { id: 4, text: "🦅 DECISIÓN DE LA FED: La Reserva Federal sube la tasa de interés sorpresivamente.", impacto: { "QQQ (Nasdaq)": -10, "SPY (S&P 500)": -6, "MELI (Mercado Libre)": -9, "YMCXO (YPF ON)": 4 } },
    { id: 5, text: "🤝 ACUERDO COMERCIAL: Mercado Libre cierra alianza logística en Brasil blindando márgenes.", impacto: { "MELI (Mercado Libre)": 18 } }
];
