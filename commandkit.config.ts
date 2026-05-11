import { cache } from "@commandkit/cache";
import { setDriver, tasks } from "@commandkit/tasks";
import { SQLiteDriver } from "@commandkit/tasks/sqlite";
import { defineConfig, noBuildOnly } from "commandkit/config";

const setupTasksDriver = noBuildOnly(() => {
	setDriver(new SQLiteDriver("./tasks.db"));
});

setupTasksDriver();

export default defineConfig({
	plugins: [cache(), tasks()],
});
