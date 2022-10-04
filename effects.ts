export type WriteStdoutEffect = {
    writeToStdout: (data: string) => void;
}

export type ReadLineEffect = {
    readLine: () => Promise<string> | string;
}

// export type ReadMemoryUsage ??

export type TranslateEffect = {
    translate: (data: string) => Promise<string> | string;
} // leave the language code stuff to the effect impl

export type BatchTranslateConfigEffect = {
    maxLen: number;
    concurrency: number;
}