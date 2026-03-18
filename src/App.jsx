import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import ERDiagram from './ERDiagram'
import FunctionMap from './FunctionMap'
import UserFlowMap from './UserFlowMap'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    {/* <ERDiagram/> */}
    {/* <FunctionMap/> */}
    <UserFlowMap/>
    </>
  )
}

export default App
