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
        name: "shared-alias",
        setup(build) {
          build.onResolve({ filter: /^@shared\// }, args => ({
            path: path.resolve(
              import.meta.dir,
              "src/shared",
              `${args.path.slice("@shared/".length)}.ts`,
            ),
          }));
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
