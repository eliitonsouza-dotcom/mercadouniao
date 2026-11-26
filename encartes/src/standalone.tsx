// Entrada da versão em arquivo único (scripts/build-single.mjs)
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/anton/400.css";
import { createRoot } from "react-dom/client";
import Home from "./app/page";

createRoot(document.getElementById("encartes-root")!).render(<Home />);
