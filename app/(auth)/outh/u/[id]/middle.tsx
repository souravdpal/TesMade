"use client";

import React, { useState } from "react";
import LoginForm from "./components/loginform";
import RegisterForm from "./components/registerform";

export default  function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
 
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
      {/* Tab Switcher */}
      <div className="flex bg-zinc-900 p-1 border border-zinc-800 rounded-xl mb-6">
        <button
          onClick={() => setMode("login")}
          className={`px-6 py-1.5 text-sm font-medium rounded-lg transition-all ${
            mode === "login"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Login
        </button>
        <button
          onClick={() => setMode("register")}
          className={`px-6 py-1.5 text-sm font-medium rounded-lg transition-all ${
            mode === "register"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Register
        </button>
      </div>

      {/* Conditional Rendering based on state */}
      {mode === "login" ? (
        <LoginForm onSwitchToRegister={() => setMode("register")} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setMode("login")} />
      )}
    </main>
  );
}