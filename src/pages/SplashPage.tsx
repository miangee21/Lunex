//src/pages/SplashPage.tsx
import SplashScreen from "@/components/shared/SplashScreen";

interface SplashPageProps {
  onComplete: () => void;
}

export default function SplashPage({ onComplete }: SplashPageProps) {
  return <SplashScreen onComplete={onComplete} />;
}
