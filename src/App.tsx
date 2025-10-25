import { ThemeProvider } from "@/components/theme-provider";

function App() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<main className="min-h-screen w-full items-center justify-center flex-col flex gap-2">
				<h1 className="text-6xl font-bold">ALCOVE</h1>
				<p className="text-lg">Coming soon</p>
			</main>
		</ThemeProvider>
	);
}

export default App;
