import { build } from 'esbuild';

// 出力先はリポジトリ内のテーマ。
// 別の親テーマ向けにディレクトリを増やしたときは、ここも足すこと。
const output = new URL(
  '../../themes/editor@beginner/include/edit/entry-status-select.js',
  import.meta.url
);

await build({
  entryPoints: [new URL('index.jsx', import.meta.url).pathname],
  outfile: output.pathname,
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof',
});
