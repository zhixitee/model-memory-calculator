import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faXmark, faRotate, faSpinner } from '@fortawesome/free-solid-svg-icons'

import { Message } from '../types/types'
import ChatSettingsPanel from '../components/ChatSettingsPanel'
import { useDeploymentGroup } from '../context/deploymentGroupContext'
import { useError } from '../context/errorContext'
import Dropdown from '../components/Dropdown'
import { EventSourceParserStream } from 'eventsource-parser/stream'

let controller = new AbortController()

type RequestObject = {
  consumer_group: string
  max_new_tokens: number
  sampling_topk: number
  sampling_topp: number
  sampling_temperature: number
  regex_string?: string
  json_schema?: string | object
  text: string
}

type OpenAIRequestObject = {
  model: string,
  messages: Array<{role: string, content: string}>
  top_p: number
  max_tokens: number
  temperature: number
  stream: boolean
}

const Chat = () => {
  const { setError } = useError()
  const [ongoingRequest, setOngoingRequest] = useState(false)
  const [config, setConfig] = useState({
    system_prompt:
      'The following is a discussion between a human and a knowledgeable and empathetic assistant. You are the Assistant. Please give a single response, in your role as the Assistant. \n\n',
    user_name: 'user',
    bot_name: 'assistant',
    host: 'http://localhost:8000',
    generation_parameters: {
      consumer_group: 'primary',
      max_new_tokens: 300,
      sampling_topk: 50,
      sampling_topp: 0.1,
      sampling_temperature: 0.7,
      regex_string: '',
      json_schema: '',
    },
  })
  const [text, setText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const { deploymentGroups, fetchDeploymentGroups, refreshing, ready } = useDeploymentGroup()
  const [selectedDeploymentGroup, setSelectedDeploymentGroup] = useState<string>('')
  const [managementUrl, setManagementUrl] = useState<string | null>(null)
  const [openAIURL, setOpenAIURL] = useState<string | null>(null)

  function preprocessChat(text: string): string {
    const updatedText = text.replace(/^.?(TitanBot|You|Assistant|Me): /, ' ').replace(/<\/s>/, '')
    return updatedText
  }

  function preparePrompt(updatedMessages: Message[]): string {
    const prompt =
      config.system_prompt +
      '\n' +
      updatedMessages
        .map((message) => {
          return message.role + ': ' + preprocessChat(message.content)
        })
        .join('\n') +
      '\nAssistant: '
    return prompt
  }

  function handleButtonClick() {
    if (!ongoingRequest) {
      sendData()
    } else {
      cancelRequest()
    }
  }

  const fetchManagementUrl = async () => {
    if (managementUrl === null) {
      try {
        const response = await fetch('status')
        if (!response.ok) {
          throw new Error('Failed to fetch the management url')
        }
        const data = await response.json()
        const currentHost = window.location.hostname
        const targetPort = data.ports[1] // Replace with your target port
        const targetUrl = `http://${currentHost}:${targetPort}` // Replace /path with your endpoint
        setManagementUrl(targetUrl)
      } catch (error) {
        console.error('Error:', error)
      }
    }
  }

  const fetchOpenAIPort = async () => {
    if (managementUrl !== null && openAIURL === null) {
      const response = await fetch(`${managementUrl}/status`)
      if (!response.ok) {
        throw new Error('Failed to fetch the openai port')
      }
      const data = await response.json()

      const targetPort = data["config"]["openai_port"]

      const openAIUrl = `http://${window.location.hostname}:${targetPort}/v1/chat/completions`
      setOpenAIURL(openAIUrl)
    }
  }


  async function sendData() {
    if (ongoingRequest) {
      console.error('Request is already ongoing.')
      return
    }
    if (text.trim().length === 0) {
      return
    }

    const newMessage: Message = {
      role: "user",
      content: text,
    }
    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)

    setText('Streaming Response...')

    setOngoingRequest(true)
    const object: RequestObject = {
      text: preparePrompt(updatedMessages),
      ...config.generation_parameters,
    }

    const open_ai_object: OpenAIRequestObject = {
      model: config.generation_parameters.consumer_group,
      messages: updatedMessages,
      top_p: config.generation_parameters.sampling_topp,
      max_tokens: config.generation_parameters.max_new_tokens,
      temperature: config.generation_parameters.sampling_temperature,
      stream: true
    }
    console.log("OpenAI Object: ", open_ai_object)
    // Remove regex_string and json_schema from object
    delete object.regex_string
    delete object.json_schema

    const body = JSON.stringify(open_ai_object)
    try {
      const response = await fetch(openAIURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      if (response.body) {
        // Create a new message
        const newMessage: Message = {
          role: 'assistant',
          content: '',
        }
        setMessages((prev) => [...prev, newMessage])
        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new EventSourceParserStream())
          .getReader()
        let isReading = true
        while (isReading) {
          const { value, done } = await reader.read()
          if (done) {
            isReading = false
            break
          }
          const responseJson = JSON.parse(value.data); // Parse the response JSON
          let delta = responseJson.choices[0].delta.content; // Extract the delta
          
          setMessages((prev) => {
            const allMessages = [...prev]

            allMessages[allMessages.length - 1].content += delta
            // major hack below
            // for some reason this function get called twice? So delta gets added twice
            // I can get around this by setting delta to '' after the first call
            // so it just adds an empty string
            delta = '' 

            return allMessages
          })
        }

        setOngoingRequest(false)
        setText('')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Fetch aborted')
          controller = new AbortController()
        } else {
          console.log(err.message)
          setError(err.message)
        }
      }
      setOngoingRequest(false)
      setText('')
    }
    console.log('API called with \n', body)
  }

  function cancelRequest() {
    if (ongoingRequest && controller) {
      controller.abort()
    }
  }

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      generation_parameters: {
        ...prev.generation_parameters,
        consumer_group: selectedDeploymentGroup,
      },
    }))
    setMessages([])
  }, [selectedDeploymentGroup])

  useEffect(() => {
    fetchManagementUrl()
  }, [])

  useEffect(() => {
    fetchOpenAIPort()
  }, [managementUrl])

  return (
    <div id='container' className='px-4 grid grid-cols-1 sm:grid-cols-[1fr,300px]'>
      <div id='chat-container'>
        <div className='content-header px-4'>
          <div className='flex flex-row'>
            <div className='text-4xl'>Takeoff Chat</div>
            <button onClick={fetchDeploymentGroups}>
              <div className='refresh-button ml-2'>
                {refreshing || !ready ? (
                  <FontAwesomeIcon icon={faSpinner} className='text-2xl animate-spin' />
                ) : (
                  <FontAwesomeIcon icon={faRotate} className='text-2xl' />
                )}
              </div>
            </button>
          </div>
          <Dropdown
            label='Select a Model Group'
            options={deploymentGroups}
            state={selectedDeploymentGroup}
            setState={setSelectedDeploymentGroup}
          />
        </div>
        <div id='chatbox' className='p-4 shadow-md rounded mb-4'>
          {messages.map((message, index) => (
            <div key={index} className={'message ' + message.role.toLowerCase()}>
              <b>{message.role}:</b> {message.content}
            </div>
          ))}
        </div>
        <div id='inputbox' className='p-4 shadow-md rounded mb-4'>
          <input
            id='message-input'
            className='shadow appearance-none border rounded py-2 px-3 leading-tight focus:outline-none focus:shadow-outline'
            type='text'
            placeholder='Type something...'
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleButtonClick()
              }
            }}
            disabled={ongoingRequest}
          />
          <button
            id='action-button'
            type='button'
            className='chat-button select-none font-bold pl-3 pr-4 ml-4 rounded focus:outline-none focus:shadow-outline items-start'
            onClick={handleButtonClick}
          >
            {ongoingRequest ? (
              <FontAwesomeIcon icon={faXmark} className='ml-1' />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className='ml-1' />
            )}
          </button>
        </div>
      </div>
      <ChatSettingsPanel config={config} setConfig={setConfig} />
    </div>
  )
}

export default Chat
