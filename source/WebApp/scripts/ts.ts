import jetpack from 'fs-jetpack';
import { task, exec } from 'oldowan';
import { exec2, inputRoot, outputVersionRoot } from './shared';

const tsLint = task('ts:lint', () => exec('eslint . --max-warnings 0 --ext .js,.ts'));
const tsInputPath = `${inputRoot}/app/index.tsx`;
const jsOutputPath = `${outputVersionRoot}/app.min.js`;
const esbuildArgs = [
    tsInputPath,
    '--preserve-symlinks',
    '--bundle',
    ...(process.env.NODE_ENV === 'ci' ? ['--minify'] : []),
    '--sourcemap',
    `--outfile=${jsOutputPath}`
];
const tsMain = task('ts:main', () => exec2('esbuild', esbuildArgs), {
    watch: () => exec2('esbuild', [...esbuildArgs, '--watch'])
});

const asmSourcePath = `${inputRoot}/app/shared/codemirror/mode-asm-instructions.txt`;
const tsAsmRegex = task('ts:asm-regex', async () => {
    // @ts-expect-error (no typings)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const regexCombiner = (await import('regex-combiner')).default;
    const asmOutputPath = `${inputRoot}/app/shared/codemirror/mode-asm-instructions.ts`;

    // read list file as array of lines
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const listContents  = ((await jetpack.readAsync(asmSourcePath))!)
        .split(/\r?\n/);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const regexPattern: string = regexCombiner(listContents).toString();

    const outputContents = [ "// This file is generated by 'tsAsmRegex' task defined in 'source/WebApp/scripts.ts'",
        `export default ${regexPattern};` ].join('\r\n');

    await jetpack.writeAsync(asmOutputPath, outputContents);
}, {
    watch: [ asmSourcePath ]
});

export const ts = task('ts', async () => {
    await tsAsmRegex();
    await Promise.all([
        tsLint(),
        tsMain()
    ]);
});