import { cache } from "@commandkit/cache";
import { defineConfig } from "commandkit/config";

export default defineConfig({
	plugins: [cache()],
});
