import { useState } from "react";
import { useForm } from "react-hook-form";

function Signup() {
  const { register, handleSubmit } = useForm();
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmit = async (data) => {
    try {
      setErrorMessage("");

      const response = await fetch("http://localhost:8080/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        window.location.href = "/";
      } else {
        setErrorMessage(result.message || "Signup failed");
      }
    } catch (error) {
      setErrorMessage("Signup request failed");
      console.error("Signup request failed", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="container">
        <label>
          Username:
          <input type="text" {...register("username")} />
        </label>
        <label>
          Password:
          <input type="password" {...register("password")} />
        </label>
        {errorMessage && <p className="form-error">{errorMessage}</p>}
        <button type="submit">Create Account</button>
        <p className="auth-switch">
          Already have an account? <a href="/login">Log in here</a>
        </p>
      </div>
    </form>
  );
}

export default Signup;
