import React from 'react'
import { useError } from '../context/errorContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

export const ErrorModal = () => {
  const { error, clearError } = useError()

  if (!error) return null

  return (
    <div className='modal-overlay'>
      <div className='modal-content' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <h1 className='text-2xl mb-2'>Error</h1>
          <button className='refresh-button' onClick={clearError}>
            <FontAwesomeIcon icon={faTimes} className='text-2xl' />
          </button>
        </div>
        <div className='mb-2'>
          There was an error processing your request. Please check the logs for more information.
        </div>
        <div className='flex flex-row flex-end'>
          <button className='form-button' onClick={clearError}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
