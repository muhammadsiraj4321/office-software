import React from 'react'

export default class ErrorBoundary extends React.Component{
  constructor(props){
    super(props)
    this.state = { error:null }
  }
  static getDerivedStateFromError(error){
    return { error }
  }
  componentDidCatch(error, info){
    // eslint-disable-next-line no-console
    console.error('App error:', error, info)
  }
  render(){
    if(this.state.error){
      return (
        <div style={{padding:24}}>
          <h1 style={{fontSize:20, fontWeight:600, marginBottom:12}}>Something went wrong.</h1>
          <pre style={{whiteSpace:'pre-wrap', color:'#b91c1c'}}>{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={()=>location.reload()} className="btn" style={{marginTop:12}}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}
