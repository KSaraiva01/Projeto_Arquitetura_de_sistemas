import path from "node:path";
import type { NextConfig } from "next";

/**
 * O frontend é servido pelo mesmo processo da API (backend/src/server.ts):
 * o Express atende /api/* e entrega o resto ao Next. Por isso não há
 * rewrites nem CORS — o navegador fala com um único domínio.
 *
 * O `node_modules` fica na raiz do repositório (um único package.json para o
 * monolito), então a raiz do workspace do Next é a pasta acima desta.
 */
const raizDoRepositorio = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: raizDoRepositorio },
  outputFileTracingRoot: raizDoRepositorio,
};

export default nextConfig;
