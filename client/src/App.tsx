import { Switch, Route } from 'wouter';
import Home from './pages/Home.js';
import NotFound from './pages/NotFound.js';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}
