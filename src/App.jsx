

import Navbar from './Navbar.jsx'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Login from './pages/Login.jsx'

function App() {
  let component
  switch (window.location.pathname) {
    case "/":
      component = <Home/>
      break
    case "/about":
      component = <About/>
      break
    case "/login":
      component = <Login/>
      break
  }
  return (
    <>
      <Navbar />
      {component}
      
    </>
  )
}

export default App
