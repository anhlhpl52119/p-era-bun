import type { ElectrobunConfig } from "electrobun";

import path from "node:path";

export default {
  app: {
    name: "vue-app",
    identifier: "vueapp.electrobun.dev",
    version: "0.0.1",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
      define: {
        __P_ERA_PROJECT_ROOT__: JSON.stringify(import.meta.dir),
      },
      plugins: [{
        /** resolve alias start with `@/` and `@share` in `src/bun` */
        name: "resolve-alias",
        setup(build) {
          build.onResolve({ filter: /^(@shared\/|@\/)/ }, async (args) => {
            const isShared = args.path.startsWith("@shared/");
            const prefix = isShared ? "@shared/" : "@/";
            const baseDir = isShared ? "src/shared" : "src/bun";

            const relativePath = args.path.slice(prefix.length);
            const basePath = path.resolve(import.meta.dir, baseDir, relativePath);

            const candidates = [
              `${basePath}.ts`,
              path.join(basePath, "index.ts"),
            ];

            for (const candidate of candidates) {
              if (await Bun.file(candidate).exists()) {
                return { path: candidate };
              }
            }

            return null;
          });
        },
      }],
    },
    // Vite builds to dist/, we copy from there
    copy: {
      "dist/index.html": "views/mainview/index.html",
      "dist/assets": "views/mainview/assets",
    },
    // Ignore Vite output in watch mode — HMR handles view rebuilds separately
    watchIgnore: ["dist/**"],
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;
