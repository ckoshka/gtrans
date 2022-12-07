// we need to somehow balance memory efficiency (i.e huge datasets) vs time efficiency, order-preservation vs retry logic.
// simplest approach is to:
// - 1. chunk it
// - 2. assign each line a "pigeon-hole" number
// - 3. if the translation succeeds, we mark it as complete
// - 4. if a contiguous chunk is all complete, we flush it to stdout, then mark all of them as flushed
// - 5. if a translation request fails, we mark it for being retried.
// - 6. we batch together the lines that need to be retried according to 1
// - 7. loop until all pigeon-holes are marked as flushed

// only happens when it's non-latin, especially far up the unicode range, implying that it has something to do with maximum length in terms of bytes.

import { use } from "./deps.ts";
import {
	BatchTranslateConfigEffect,
	ReadLineEffect,
	TranslateEffect,
	WriteStdoutEffect,
} from "./effects.ts";

export const chunkStdin = use<ReadLineEffect & BatchTranslateConfigEffect>()
	.map2(async function* (fx) {
		const enc = new TextEncoder();
		let chunk = "";
		for (;;) {
			if (enc.encode(chunk).length >= fx.maxLen) {
				yield chunk; // will include the new line
				chunk = "";
			}
			try {
				chunk += await fx.readLine();
				chunk += "\n";
			} catch (e) {
				console.error(e);
				yield chunk;
				break;
			}
		}
	});

export const batchTranslate = chunkStdin.chain((chunks) =>
	use<TranslateEffect & BatchTranslateConfigEffect>()
		.map2(async function* (fx) {
			const promises: Promise<string>[] = [];

			let shouldBreak = false;

			const sleep = () =>
				new Promise((resolve) => setTimeout(resolve, fx.pauseMs));

			(async () => {
				for await (const chunk of chunks) {
					await sleep();
					promises.push(Promise.resolve(fx.translate(chunk)));
				}
				shouldBreak = true;
			})();

			for (;;) {
				const prom = promises.shift();
				if (prom === undefined) {
					await sleep();
					continue;
				}
				yield await prom;
				if (shouldBreak && promises.length === 0) {
					break;
				}
			}
		})
);

export const translateAndLog = batchTranslate.chain((txs) =>
	use<WriteStdoutEffect>()
		.map2(async (f) => {
			for await (const tx of txs) {
				f.writeToStdout(tx);
			}
		})
);

// to make this usable: retain the original (easy), make it accept command-line flags
