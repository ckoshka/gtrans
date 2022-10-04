export type Translation = { original: string; translation: string };

import { R } from "./deps.ts";

export const translate =
	(sourceLang: string) => (targetLang: string) => async (text: string) => {
		const url = new URL("https://translate.google.com/translate_a/single");
        const appendMany = (params: [string, string][]) => params.forEach(k => url.searchParams.append(k[0], k[1]));
		appendMany([
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
			["iid", "1dd3b944-fa62-4b55-b330-74909a99969e"]
		]);

        const data = {
            "sl": sourceLang,
            "tl": targetLang,
            "q": text
        }

		const body = new URLSearchParams(data);

		const response = await fetch(url.toString(), {
			method: "POST",
			headers: {
				"Content-Type":
					"application/x-www-form-urlencoded;charset=utf-8",
				"User-Agent":
					"AndroidTranslate/5.3.0.RC02.130475354-53000263 5.1 phone TRANSLATE_OPM5_TEST_1",
			},
			body,
		});

		const json = await response.json();
		// Each sentence will be a dict with the fields "original" and "translation"
		const translations =
			(json.sentences as Array<{ orig: string; trans: string }>)
				.map((v) => {
					return v.orig && v.trans
						? {
							original: v.orig,
							translation: v.trans,
						}
						: null;
				})
				.filter((n): n is { original: string; translation: string } =>
					n !== null
				)
				.reverse();

            return translations;
	};

