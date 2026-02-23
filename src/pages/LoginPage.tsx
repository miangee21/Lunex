import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
      <h1 className="text-4xl font-bold text-primary">Lunex</h1>
      <p className="text-foreground text-2xl font-semibold">This is Login Page</p>
      <p className="text-muted-foreground text-sm">Don't have an account?</p>
      <Link
        to="/signup"
        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:opacity-90 font-medium"
      >
        Go to Signup
      </Link>
    </div>
  );
}