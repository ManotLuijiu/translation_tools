import fs from "fs";
import path from "path";
// const common_site_config = require("../../../sites/common_site_config.json");
// const { webserver_port } = common_site_config;
let webserver_port = 8000;

// Try to load common_site_config.json, but provide fallbacks if not available
try {
  const configPath = path.resolve(
    __dirname,
    "../../../sites/common_site_config.json"
  );
  const configFile = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(configFile);
  webserver_port = config.webserver_port || 8000;
} catch (error) {
  console.warn(
    `Could not load common_site_config.json, using default port 8000 ${error}`
  );
}

export default {
  "^/(app|api|assets|files|private)": {
    target: `http://127.0.0.1:${webserver_port}`,
    ws: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router: function (req: any) {
      const site_name = req.headers.host.split(":")[0];
      return `http://${site_name}:${webserver_port}`;
    },
  },
};
