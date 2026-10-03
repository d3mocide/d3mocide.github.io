import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Needed for Docker port mapping
    strictPort: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
  build: {
    // Enable source maps for debugging
    sourcemap: false,
    
    // Chunk size warnings
    chunkSizeWarningLimit: 600,
    
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and related libraries
          'react-vendor': ['react', 'react-dom'],
          
          // UI libraries chunk
          'ui-vendor': ['framer-motion', 're-resizable', 'react-draggable'],
          
          // State management
          'state-vendor': ['zustand'],
        },
        
        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    
    // Minification options
    minify: 'esbuild',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
});
