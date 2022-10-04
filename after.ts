import { GoogleTranslateConfig, GoogleTranslateConfigFull } from "./types.ts";
import { Maybe, R } from "./deps.ts";

const addParams = (url: URL) =>
	(params: [string, string][]) => {
		params.forEach((k) => url.searchParams.append(k[0], k[1]));
		return url;
	};

const createBaseUrl = () =>
	new URL("https://translate.google.com/translate_a/single");

const buildUrl = ({ targetLang }: { targetLang: string }) =>
	R.pipe(
		createBaseUrl,
		addParams,
	)()([
		["client", "at"],
		["dt", "t"],
		["dt", "ld"],
		["dt", "qca"],
		["dt", "rm"],
		["dt", "bd"],
		["dj", "1"],
		["hl", targetLang],
		["ie", "UTF-8"],
		["oe", "UTF-8"],
		["inputm", "2"],
		["otf", "2"],
		["iid", "1dd3b944-fa62-4b55-b330-74909a99969e"],
	]);

const createBody = R.pipe(
	(cfg: GoogleTranslateConfigFull) => ({
		"sl": cfg.sourceLang,
		"tl": cfg.targetLang,
		"q": cfg.text,
	}),
	(data) => new URLSearchParams(data),
	(body) => ({
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
			"User-Agent":
				"AndroidTranslate/5.3.0.RC02.130475354-53000263 5.1 phone TRANSLATE_OPM5_TEST_1",
		},
		body,
	}),
);

const procTranslations = (data: Array<{ orig: string; trans: string }>) =>
	data.map((v) =>
		v.orig && v.trans
			? Maybe.some({
				original: v.orig,
				translation: v.trans,
			})
			: Maybe.none()
	)
		.filter((m) => m.isSome())
		.map((m) => m.get())
		.reverse();

const fillDefaults = (
	cfg:
		& Pick<GoogleTranslateConfigFull, "targetLang" | "text">
		& Partial<Pick<GoogleTranslateConfigFull, "sourceLang">>,
) => ({
	sourceLang: "auto",
	...cfg,
});

export const translate = (cfg: GoogleTranslateConfig) =>
	R.pipe(
		fillDefaults,
		createBody,
		(body) => [buildUrl(cfg).toString(), body] as const,
		(params) => fetch(...params),
		(r) => r.then((resp) => resp.json()),
		(r) => r.then((json) => procTranslations(json.sentences)),
	)(cfg);

/*translate({
    targetLang: "br",
    text: "Good morning"
}).then(console.log)*/
// make it not partial
