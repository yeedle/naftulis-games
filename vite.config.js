import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "src/index.html",
        chess: "src/chess.html",
      },
    },
  },
  server: {
    open: true,
  },
});
