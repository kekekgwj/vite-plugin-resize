# vite-plugin-resize

> Vite plugin for displaying pages in fixed ratio of window


## Motivation
- Simple config to control the size of React elements
- Support displaying on large screens
- eg: A page or element was developed based on a window width of 1920 pixels as per the design. The element's width in the design is 860 pixels. However, the expectation is for the element to always occupy half of the window width, so set the plugin attribute originWidth to half of 1920. The plugin will automatically adjust the display size of the element to ensure it always occupies half of the window width.
## Usage

```sh
pnpm i vite-plugin-resize
```

```ts
// vite.config.ts
import VitePluginResize from 'vite-plugin-resize'

// @see https://vitejs.dev/config/
export default defineConfig({
  plugins: [VitePluginResize({
   // options
  })],
})

## Options

```ts
interface IOptions {
  originWidth: number | string | null;
  originHeight: number | string | null;
  fileName: string | null;
}

// example
export default defineConfig({
  plugins: [react(), VitePluginResize({
    // target display height
    originHeight: 500,
    // target display witdh
    originWidth: 500,
    // the file name of the target React element 
    fileName: "/src/App",
  })],
})
```


