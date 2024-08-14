import React from 'react'
import ActionButton from '../components/ActionButton'

const Home = () => {
  return (
    <div>
      <div className='flex flex-col items-center h-screen w-200'>
        <h1 className='text-4xl mb-4'>Titan Takeoff Server</h1>
        <ActionButton
          title='Playground UI'
          description='Experiment with your AI models and test them out.'
          link='/playground'
          clientRendered={true}
        />
        <ActionButton
          title='Chat UI'
          description='Engage in real-time conversations with your AI models.'
          link='/chat'
          clientRendered={true}
        />
        <ActionButton
          title='Metrics Dashboard'
          description='View, monitor metrics for your AI models.'
          link='/metrics'
          clientRendered={true}
        />
        <ActionButton
          title='Memory Calculator'
          description='Find out how much memory you need for your AI models.'
          link='/calculator'
          clientRendered={true}
        />
        <ActionButton
          title='Takeoff Documentation'
          description='View our official documentation for Titan Takeoff Server.'
          link='https://docs.titanml.co/docs/intro'
          clientRendered={false}
        />
        <ActionButton
          title='API Documentation'
          description='View our API documentation for Titan Takeoff Server.'
          link='/docs'
          clientRendered={false}
        />
      </div>
    </div>
  )
}

export default Home
