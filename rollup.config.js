import serve from 'rollup-plugin-serve';
import commonjs from "rollup-plugin-commonjs";
import resolve from 'rollup-plugin-node-resolve';

export default {
    input: './src_js/main.js',
    output: {
        file: './dist/main.js',
        format: 'iife',
        sourceMap: 'inline'
    },
    plugins: [
        resolve({
            jsnext: true,
            main: true,
            browser: true,
        }),
        // ts(),
        commonjs(),
        // typescript({module: 'CommonJS'}),
        // commonjs(),
        serve('dist')
    ]
}
