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
	"^W5000",
	"PSP",
	"XLE",
] as const;

export const ALL_INSTRUMENTS = [...INSTRUMENTS, ...INDICATOR_INSTRUMENTS] as const;

export type InstrumentSymbol = (typeof ALL_INSTRUMENTS)[number];
