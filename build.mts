/* eslint-env node */
import esbuild, { Plugin } from "esbuild";
import babel from "esbuild-plugin-babel";

const watch = process.argv.some((arg) => ["--watch", "-w"].includes(arg));

const context = await esbuild.context({
  bundle: true,
  platform: "node",
  target: "rhino1.7.15",
  external: ["kolmafia"],
  entryPoints: {
    "scripts/goorbo/goorbo": "src/main.ts",
    "relay/relay_goorbo": "src/relay.ts",
  },
  entryNames: "[dir]/[name]",
  outdir: "dist",
  plugins: [babel() as Plugin],
});

await context.rebuild();

if (watch) {
  await context.watch();
} else {
  context.dispose();
}
