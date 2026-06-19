export const ASSETS = [
    { ticker: "SPY (S&P 500)", tipo: "ETF CEDEAR", precio: 12000, delta: 0, pesoRiesgo: 2, desc: "Réplica del índice S&P 500: las 500 mayores empresas de EE.UU. en una sola operación. La opción más diversificada y defensiva." },
    { ticker: "QQQ (Nasdaq)", tipo: "ETF CEDEAR", precio: 15000, delta: 0, pesoRiesgo: 3, desc: "Sigue al Nasdaq-100, fuertemente tecnológico. Más crecimiento y más volatilidad que el S&P 500." },
    { ticker: "GOOGL (Google)", tipo: "CEDEAR Tech", precio: 8000, delta: 0, pesoRiesgo: 3, desc: "Acción de Alphabet (Google). Gigante de publicidad digital, búsqueda e inteligencia artificial." },
    { ticker: "MSFT (Microsoft)", tipo: "CEDEAR Tech", precio: 16000, delta: 0, pesoRiesgo: 3, desc: "Microsoft: software, nube (Azure) e IA. Ingresos recurrentes y balance sólido." },
    { ticker: "MELI (Mercado Libre)", tipo: "CEDEAR Latam", precio: 25000, delta: 0, pesoRiesgo: 4, desc: "Líder de e-commerce y fintech (Mercado Pago) en Latinoamérica. Alto crecimiento, alta volatilidad." },
    { ticker: "VIST (Vista Energy)", tipo: "CEDEAR O&G", precio: 11000, delta: 0, pesoRiesgo: 4, desc: "Petrolera enfocada en Vaca Muerta. Su valor depende del precio del crudo y del costo de extracción." },
    { ticker: "YMCXO (YPF ON)", tipo: "ON Dólar Cable", precio: 5000, delta: 0, pesoRiesgo: 1, desc: "Obligación Negociable de YPF en dólares: renta fija que paga intereses periódicos. El activo más conservador de la lista." }
];

export const NEWS = [
    { id: 1, text: "⚠️ TENSIONES GEOPOLÍTICAS: Conflicto armado en Medio Oriente bloquea refinerías.", impacto: { "VIST (Vista Energy)": 20, "SPY (S&P 500)": -6, "QQQ (Nasdaq)": -8, "GOOGL (Google)": -4 } },
    { id: 2, text: "📊 BALANCES TECH: Microsoft ($MSFT) reporta ingresos por Inteligencia Artificial un 40% arriba.", impacto: { "MSFT (Microsoft)": 15, "QQQ (Nasdaq)": 7, "GOOGL (Google)": 4 } },
    { id: 3, text: "💸 DATO INFLACIÓN ARG: El IPC sale más bajo de lo previsto. Sube el consumo local.", impacto: { "MELI (Mercado Libre)": 14, "YMCXO (YPF ON)": 2 } },
    { id: 4, text: "🦅 DECISIÓN DE LA FED: La Reserva Federal sube la tasa de interés sorpresivamente.", impacto: { "QQQ (Nasdaq)": -10, "SPY (S&P 500)": -6, "MELI (Mercado Libre)": -9, "YMCXO (YPF ON)": 4 } },
    { id: 5, text: "🤝 ACUERDO COMERCIAL: Mercado Libre cierra alianza logística en Brasil blindando márgenes.", impacto: { "MELI (Mercado Libre)": 18 } }
];
