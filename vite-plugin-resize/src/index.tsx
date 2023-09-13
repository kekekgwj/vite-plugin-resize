// import { createUnplugin } from "unplugin";
import type { PluginOption } from "vite";
import _traverse from "@babel/traverse";
import babelTypes from "@babel/types";

import { parse } from "@babel/parser";
import _generate from "@babel/generator";

import { createFilter } from "vite";
import { SourceMapConsumer } from "source-map";
import type { RawSourceMap } from "source-map";

const traverse = _traverse.default as typeof _traverse;
const generate = _generate.default as typeof _generate;
interface IOptions {
  originWidth: number | string;
  originHeight: number | string;
  fileName: string;
}
const injectPrefixCode = `import React, { useEffect as _useEffect, useState as _useState } from 'react'; \nimport { useDebounceFn } from 'ahooks';`;
const wrappWithInjectCode = ({
  modifiedCode,
  exportDefaultName,
  originWidth,
  originHeight,
}) =>
  `${injectPrefixCode}\n${modifiedCode}\n ${getSuffix({
    exportDefaultName,
    originWidth,
    originHeight,
  })}`;
const getSuffix = ({ exportDefaultName, originWidth, originHeight }) => `
const w = ${originWidth};
const h = ${originHeight};
const defaultStyle = {
  width: w + "px",
  height: h + "px",
  transform: "scale(1) translate(-50%, 0)",
};
const ResizeApp = () => {
  const [scale, setScale] = _useState(defaultStyle);
  const { run } = useDebounceFn(
    // function
    () => {
      setScale(getStyleWithScale());
    },
  );
  _useEffect(() => {
    // 手动触发一次
    run();
    window.addEventListener("resize", run);
    return () => {
      window.removeEventListener("resize", run);
    };
  }, []);

  function getScale() {
    const adapter = document.getElementById("adapter");
    if (!adapter) return 1;

    const sw = adapter.offsetWidth / parseInt(w);
    const sh = adapter.offsetHeight / parseInt(h);
    console.log(w, h, sw, sh)

    return sw < sh ? sw : sh;
  }
  function getStyleWithScale() {
    return {
      ...defaultStyle,
      transform: \`scale(\${getScale()}) translate(-50%, 0)\`,
    };
  }

  return (
    <div 
      id="adapter" 
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
    }}>
      <div 
        style={{
          transformOrigin: '0 0',
          position: 'absolute',
          left: '50%',
          ...scale
			}}>
        {JSON.stringify(scale)}
        <${exportDefaultName}/>
      </div>
    </div>
  );
};
export default ResizeApp;
`;

export default function resizePlugin(options: IOptions = {}): PluginOption {
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
      if (!filter(id)) {
        return;
      }
      const exactFileName = `${root}${fileName}`.toLowerCase();
      const fileID = id.replace(/\.(jsx|tsx).*$/, "").toLowerCase();
      if (fileID !== exactFileName) {
        return;
      }
      const rawSourcemap = this.getCombinedSourcemap();
      const consumer = await new SourceMapConsumer(
        rawSourcemap as RawSourceMap
      );
      const ast = parse(code, {
        sourceType: "unambiguous",
        sourceFilename: id,
        plugins: ["jsx", "flow"],
      });
      let exportDefaultName = null;
      traverse(ast, {
        ExportDefaultDeclaration(path) {
          const declaration = path.get("declaration");
          path.remove(declaration);
          // 判断声明的类型
          if (declaration.isIdentifier()) {
            // 如果声明是标识符 (Identifier)，则获取其名称
            exportDefaultName = declaration.node.name;
          } else if (declaration.isFunctionDeclaration()) {
            // 如果声明是函数声明 (FunctionDeclaration)，则获取函数名
            exportDefaultName = declaration.node.id.name;
          } else if (declaration.isClassDeclaration()) {
            // 如果声明是类声明 (ClassDeclaration)，则获取类名
            exportDefaultName = declaration.node.id.name;
          }
          // declaration.replaceWith(babelTypes.identifier("ResizeApp"));
        },
      });

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
