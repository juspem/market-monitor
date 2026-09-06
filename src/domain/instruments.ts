export const INSTRUMENTS = ["SPY", "QQQ", "IWM", "DIA", "RSP"] as const;

export type InstrumentSymbol = (typeof INSTRUMENTS)[number];
