#!/usr/bin/env -S deno run -A

import { readLines } from "https://deno.land/std@0.147.0/io/buffer.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.158.0/streams/mod.ts";
import { translate } from "./after.ts";
import { translateAndLog } from "./mass.ts";
import {
	Command,
} from "https://deno.land/x/cliffy@v0.25.2/command/mod.ts";

await new Command()
	.name("batcht")
	.version("0.1.0")
	.description("Batch translator")
	.option("-f, --from <from:string>", "From what language?", {
		default: "auto",
	})
  .option("-i, --input <input:string>", "Defaults to stdin, can be a filename.", {
		default: "stdin",
	})
	.option("-k, --keep_original", "Keep around the original?", {
		default: true,
	})
	.option("-t, --to <to:string>", "To what language?", {
		required: true,
	})
	.action(async (options) => {
    const lineReader = readLines(
      readerFromStreamReader(options.input === "stdin" ? Deno.stdin.readable.getReader() : (await Deno.open(options.input)).readable.getReader()),
    );

		const defaults = translateAndLog.implF(() => ({
			maxLen: 2500, // needs to be kept here bcs unicode codepoints are counted differently by google, leading to errors for some languages
			readLine: async () => {
				const line = await lineReader.next();
				if (line.done === true) {
					throw new Error();
				}
				return line.value;
			},
			writeToStdout: (s) => console.log(s.trim()),
		}));

		await defaults.run({
			pauseMs: 3,
			translate: (s) =>
				translate({
					text: s,
					targetLang: options.to,
					sourceLang: options.from,
				}).then((arr) =>
					arr.map((a) =>
						a.translation.trim() + "\t" + a.original.trim()
					).join("\n")
				),
		}).then(() => Deno.exit());
	})
	.parse(Deno.args);
