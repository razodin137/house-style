/*
 * Fixture pair for the JSX rules: good.jsx is the house style, and eslint --fix
 * rewrites unformatted.jsx to match it.
 */

function useEffect(callback) {
  callback()
}

function Greeting({ name }) {
  useEffect(() => {
    console.log(name)
  }, [ name ])

  const greeting = `Hello, ${name}`

  return (
    <p className="greeting">
      {greeting}
    </p>
  )
}

export { Greeting }
