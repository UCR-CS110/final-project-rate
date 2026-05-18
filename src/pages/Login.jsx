
import { useForm } from "react-hook-form";

function Login() {
  return (
    <form>
      <div className="container">
      <label>Username:
        <input  bsSize="lg"type="text" />
      </label>
      <label>Password:
        <input type="password" />
      </label>
      </div>
    </form>
  )
}

export default Login;
