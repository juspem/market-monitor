import { Dashboard } from "./features/dashboard/Dashboard";
import "./styles.css";
import { ThemeProvider } from "./theme";

export default function App() {
  return <ThemeProvider><Dashboard /></ThemeProvider>;
}
