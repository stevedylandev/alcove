import { useEvolu } from "./main";

function App() {
	const { insert, update } = useEvolu();

	return (
		<main className="min-h-screen w-full items-center justify-center flex-col flex gap-2">
			<h1 className="text-6xl font-bold">ALCOVE</h1>
			<p className="text-lg">Coming soon</p>
		</main>
	);
}

export default App;
