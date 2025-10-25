import { StrictMode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { createRoot } from "react-dom/client";
import { createEvolu, getOrThrow, SimpleName } from "@evolu/common";
import { createUseEvolu, EvoluProvider } from "@evolu/react";
import { Schema } from "./scheme.ts";
import { evoluReactWebDeps } from "@evolu/react-web";
import "./index.css";
import App from "./App.tsx";

const evolu = createEvolu(evoluReactWebDeps)(Schema, {
	name: getOrThrow(SimpleName.from("your-app-name")),
	syncUrl: "wss://your-sync-url", // optional, defaults to wss://free.evoluhq.com
});

export const useEvolu = createUseEvolu(evolu);

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<EvoluProvider value={evolu}>
			<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
				<App />
			</ThemeProvider>
		</EvoluProvider>
	</StrictMode>,
);
