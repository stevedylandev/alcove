import { StrictMode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { createRoot } from "react-dom/client";
import { EvoluProvider } from "@evolu/react";
import "./index.css";
import App from "./App.tsx";
import { evolu } from "./lib/evolu.ts";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<EvoluProvider value={evolu}>
			<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
				<App />
			</ThemeProvider>
		</EvoluProvider>
	</StrictMode>,
);
