import React from 'react'
import { useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()
  return (
    <div>
      <div className='flex flex-col items-center h-screen w-200'>
        <h1 className='text-4xl mb-4'>404 - Not found</h1>
        <h3 className='text-ml mb-2'>
          The page you are looking for is not known. Why not visit one of our known pages?
        </h3>
        <button onClick={() => navigate('/playground')}>
          <div className='home-button-small flex-grow m-2 p-4 border'>
            <div className='home-button-title'>Playground UI</div>
          </div>
        </button>
        <button onClick={() => navigate('/chat')}>
          <div className='home-button-small flex-grow m-2 p-4 border'>
            <div className='home-button-title'>Chat UI</div>
          </div>
        </button>
        <button onClick={() => (window.location.href = 'https://docs.titanml.co/docs/intro')}>
          <div className='home-button-small flex-grow m-2 p-4 border'>
            <div className='home-button-title'>Takeoff Docs</div>
          </div>
        </button>
        <button onClick={() => (window.location.href = '/docs')}>
          <div className='home-button-small flex-grow m-2 p-4 border'>
            <div className='home-button-title'>API Docs</div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default NotFound
