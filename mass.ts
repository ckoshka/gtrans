// we need to somehow balance memory efficiency (i.e huge datasets) vs time efficiency, order-preservation vs retry logic.
// simplest approach is to:
// - 1. chunk it
// - 2. assign each line a "pigeon-hole" number
// - 3. if the translation succeeds, we mark it as complete
// - 4. if a contiguous chunk is all complete, we flush it to stdout, then mark all of them as flushed
// - 5. if a translation request fails, we mark it for being retried.
// - 6. we batch together the lines that need to be retried according to 1
// - 7. loop until all pigeon-holes are marked as flushed

import { use } from "./deps.ts";
import {
	BatchTranslateConfigEffect,
	ReadLineEffect,
	TranslateEffect,
	WriteStdoutEffect,
} from "./effects.ts";
import {readLines} from "https://deno.land/std/io/buffer.ts";
import * as mod from "https://deno.land/std@0.158.0/streams/mod.ts";
import { translate } from "./after.ts";


export const chunkStdin = use<ReadLineEffect & BatchTranslateConfigEffect>()
	.map2(async function* (fx) {
		let chunk = "";
		for (;;) {
			if (chunk.length >= fx.maxLen) {
				yield chunk; // will include the new line
				chunk = "";
			}
			try {
				chunk += await fx.readLine();
				chunk += "\n";
			} catch {
				break;
			}
		}
	});

export const batchTranslate = chunkStdin.chain((chunks) =>
	use<TranslateEffect & BatchTranslateConfigEffect>()
		.map2(async function* (fx) {
			const guard = (() => {
				const promises: Promise<string>[] = [];
				let waitOn = (_: number) => {};
				return {
					push: async (promise: Promise<string>) => {
						if (promises.length >= fx.concurrency) {
							await promises[0];
						}
						promises.push(promise);
						waitOn(0);
					},
					pull: async () => {
						if (promises.length === 0) {
							await new Promise((resolve) => {
								waitOn = resolve;
							});
						}
						return promises.shift();
					},
				};
			})();

			let shouldBreak = false;

			(async () => {
				for await (const chunk of chunks) {
					await guard.push(Promise.resolve(fx.translate(chunk)));
				}
				shouldBreak = true;
			})();

			for (;;) {
				if (shouldBreak) {
					break;
				}
				const prom = await guard.pull();
				if (prom === undefined) {
					continue;
				}
				yield prom;
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

const lineReader = readLines(mod.readerFromStreamReader(Deno.stdin.readable.getReader()));

translateAndLog.run({
    concurrency: 4,
    maxLen: 4800,
    readLine: async () => {
        const line = await lineReader.next();
        if (line.done === true) {
            throw new Error();
        }
        return line.value;
    },
    translate: s => translate({
        text: s,
        targetLang: "fr",
    }).then(arr => arr.map(a => a.translation).join("\n")),
    writeToStdout: console.log
})