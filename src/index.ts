// import { createUnplugin } from "unplugin";
import type { PluginOption } from "vite";
import _traverse from "@babel/traverse";

import { parse } from "@babel/parser";
import _generate from "@babel/generator";

import { createFilter } from "vite";
// import { SourceMapConsumer } from "source-map";
// import type { RawSourceMap } from "source-map";

const traverse = _traverse.default as unknown as typeof _traverse;
const generate = _generate.default as unknown as typeof _generate;
interface IOptions {
  originWidth: number | string | null;
  originHeight: number | string | null;
  fileName: string | null;
}
interface IInject {
  modifiedCode: string,
  exportDefaultName: string,
  originWidth: string | number,
  originHeight: string | number,

}
const injectPrefixCode = `import React, { useEffect as _useEffect, useState as _useState } from 'react'; \n`;
const wrappWithInjectCode = ({
  modifiedCode,
  exportDefaultName,
  originWidth,
  originHeight,
}: IInject) =>
  `${injectPrefixCode}\n${modifiedCode}\n ${getSuffix({
    exportDefaultName,
    originWidth,
    originHeight,
  })}`;
  
const getSuffix = ({ exportDefaultName, originWidth, originHeight }: Omit<IInject, "modifiedCode">) => `
const w = ${originWidth};
const h = ${originHeight};
const defaultStyle = {
  width: w + "px",
  height: h + "px",
  transform: "scale(1)",
};
import { useRef, useCallback } from 'react';

function useDebounceFn<T extends (...args: any[]) => any>(fn: T, delay: number) {
  const timeoutRef = useRef<number>();

  const debouncedFn = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      fn(...args);
    }, delay);
  }, [fn, delay]);

  // Cleanup on unmount
  const cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { debouncedFn, cancel };
}

const ResizeApp = () => {
  const [scale, setScale] = _useState(defaultStyle);
  
  const { debouncedFn, cancel } = useDebounceFn(
    () => {
      setScale(getStyleWithScale());
    },
  );
  _useEffect(() => {
    debouncedFn();
    window.addEventListener("resize", debouncedFn);
    return () => {
      window.removeEventListener("resize", debouncedFn);
    };
  }, []);

  function getStyleWithScale() {
    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;
    const sw = clientWidth / parseInt(w);
    const sh = clientHeight / parseInt(h);
    let scale = 1
    let targetHeight = h, targetWidth = w;

    if (clientWidth / clientHeight < w / h) {
      scale = sw;
      targetHeight = parseInt(clientHeight / scale) + "px";
    } else {
      scale = sh;
      targetWidth = parseInt(clientWidth / scale) + "px";
    } 
    return {
      ...defaultStyle,
      width: targetWidth,
      height: targetHeight,
      transform: \`scale(\${scale})\`,
    };
  }

  return (
      <div 
        style={{
          transformOrigin: '0 0',
          ...scale
			}}>
        <${exportDefaultName}/>
      </div>
  );
};
export default ResizeApp;
`;

export default function resizePlugin(options: IOptions = {
  originWidth: null,
  originHeight: null,
  fileName: null,
}): PluginOption {
  const { originWidth, originHeight, fileName } = options;
  let root = "";
  const filter = createFilter(
    [/\.[jt]sx?$/],
    [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/]
  );
  return {
    name: "resize",

    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    async transform(code, id) {
      debugger
      if (!originWidth || !originHeight || !fileName) {
        return;
      }
      if (!filter(id)) {
        return;
      }
      const exactFileName = `${root}${fileName}`.toLowerCase();
      const fileID = id.replace(/\.(jsx|tsx).*$/, "").toLowerCase();
      if (fileID !== exactFileName) {
        return;
      }
      // const rawSourcemap = this.getCombinedSourcemap();
      // const consumer = await new SourceMapConsumer(
      //   rawSourcemap as RawSourceMap
      // );
      const ast = parse(code, {
        sourceType: "unambiguous",
        sourceFilename: id,
        plugins: ["jsx", "flow"],
      });
      let exportDefaultName = null;
      // @ts-ignore
      traverse(ast, {
        ExportDefaultDeclaration(path: any) {
          const declaration = path.get("declaration");
          path.remove(declaration);
          // 判断声明的类型
          if (declaration.isIdentifier()) {
            exportDefaultName = declaration.node.name;
          } else if (declaration.isFunctionDeclaration()) {
            exportDefaultName = declaration.node.id.name;
          } else if (declaration.isClassDeclaration()) {
            exportDefaultName = declaration.node.id.name;
          }
        },
      });
      if (!exportDefaultName) {
        return;
      }
      // @ts-ignore
      const modifiedCode = generate(ast).code;

      return wrappWithInjectCode({
        modifiedCode,
        exportDefaultName,
        originWidth,
        originHeight,
      });
    },
  };
}
