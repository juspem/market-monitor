export const INSTRUMENTS = ["^GSPC", "^NDX", "^RUT", "^DJI", "^SP500EW"] as const;

export const INDICATOR_INSTRUMENTS = [
	"HYG",
	"TLT",
	"IEF",
	"DBC",
	"GLD",
	"USO",
	"SLV",
	"UNG",
	"UUP",
	"EEM",
	"VNQ",
	"^VIX",
	"^VIX3M",
	"^W5000",
	"PSP",
	"XLE",
] as const;

export const CURRENCY_INSTRUMENTS = ["EURUSD=X", "JPY=X", "GBPUSD=X"] as const;
export const YIELD_INSTRUMENTS = ["DGS2", "DGS10"] as const;
export const ALL_INSTRUMENTS = [...INSTRUMENTS, ...INDICATOR_INSTRUMENTS, ...CURRENCY_INSTRUMENTS, ...YIELD_INSTRUMENTS] as const;

export type YieldSymbol = (typeof YIELD_INSTRUMENTS)[number];
export const isYieldSymbol = (symbol: InstrumentSymbol): symbol is YieldSymbol =>
  YIELD_INSTRUMENTS.some((yieldSymbol) => yieldSymbol === symbol);

export type InstrumentSymbol = (typeof ALL_INSTRUMENTS)[number];
