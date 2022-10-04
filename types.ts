export type Param<T, V extends { subtype?: string, default?: T, required?: true, constraint?: string}> = T;
//...so you *can* have named type parameters

export type GoogleTranslateConfigFull = {
	sourceLang: Param<string, { subtype: "language_code"; default: "auto" }>;
	targetLang: Param<string, { subtype: "language_code"; required: true }>;
	text: Param<string, { required: true; constraint: "under_5000_chars" }>;
};

export type GoogleTranslateConfig =
	& Pick<GoogleTranslateConfigFull, "targetLang" | "text">
	& Partial<Pick<GoogleTranslateConfigFull, "sourceLang">>;