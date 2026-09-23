import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { whop } from "@whop/cli/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

function fixWhopServerEntry(): Plugin {
  return {
    name: "fix-whop-server-entry",

    writeBundle(options) {
      const outDir = options.dir;

      if (!outDir || !outDir.endsWith("server")) {
        return;
      }

      const serverFile = resolve(outDir, "server.js");
      const indexFile = resolve(outDir, "index.js");

      if (existsSync(serverFile) && !existsSync(indexFile)) {
        renameSync(serverFile, indexFile);
        console.log("[smart-point] server.js → index.js");
      }
    },
  };
}

export default defineConfig({
  plugins: [
    fixWhopServerEntry(),

    whop(),

    cloudflare({
      viteEnvironment: {
        name: "ssr",
      },
    }),

    tailwindcss(),

    tanstackStart({
      server: {
        entry: "server",
      },
    }),

    viteReact(),
  ],

  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
  },
});