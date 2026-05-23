
import { useState } from "react";
import { useForm } from "react-hook-form";

function Login() {
  const { register, handleSubmit } = useForm();
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data) => {
    try {
      setErrorMessage("");

      const response = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        window.location.href = "/";
      } else {
        setErrorMessage(result.message || "Login failed");
      }
    } catch (error) {
      setErrorMessage("Login request failed");
      console.error("Login request failed", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="container">
        <label>
          Username:
          <input type="text" {...register("username", { required: true })} />
        </label>
        <label>
          Password:
          <input type="password" {...register("password", { required: true })} />
        </label>
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <button type="submit">Log In</button>
        <p className="auth-switch">
          Don't have an account? <a href="/signup">Sign up here</a>
        </p>
      </div>
    </form>
  )
}

export default Login;
