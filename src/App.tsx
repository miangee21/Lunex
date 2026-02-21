import './App.css';
import { Button } from './components/ui/button';
import { useThemeStore } from './store/themeStore';
import { Sun, Moon } from 'lucide-react';

function App() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className='items-center justify-center flex min-h-screen flex-col gap-4 bg-background'>
      <p className='text-foreground text-4xl'>hello this is main page</p>
      <Button variant="default">Click Me</Button>
      <button
        onClick={toggleTheme}
        className='p-2 rounded-lg bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground'
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  )
}

export default App;