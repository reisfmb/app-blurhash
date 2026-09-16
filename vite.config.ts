import { defineConfig } from 'vite-plus';

// Server-only app: no client bundle, so this config carries just the `vp pack` step.
// `vp pack` (tsdown) compiles server-side .ts to per-file CommonJS, mirroring the tree
// into build/ so XP runs each file in place.
export default defineConfig({
  pack: {
    entry: ['src/main/resources/**/*.ts', '!src/main/resources/**/*.d.ts'],
    root: 'src/main/resources',
    outDir: 'build/resources/main',
    format: 'cjs',
    platform: 'node',
    unbundle: true, // per-file output, not one bundle
    outExtensions: () => ({ js: '.js' }), // XP wants .js, not the cjs default .cjs
    deps: { neverBundle: [/^\//] }, // absolute XP requires (/lib/*, /react4xp/*) stay external
    target: 'es2023',
    treeshake: false, // XP calls exports.get/all at runtime — don't drop as dead
    clean: false,
    dts: false,
    sourcemap: false,
    report: false,
  },
});
