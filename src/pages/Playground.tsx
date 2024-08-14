import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaperPlane, faXmark, faRotate, faSpinner } from '@fortawesome/free-solid-svg-icons'

import { EventSourceParserStream } from 'eventsource-parser/stream'

import SettingsPanel from '../components/SettingsPanel'

import { VariableMappings } from '../types/types'
import { useDeploymentGroup } from '../context/deploymentGroupContext'
import { useError } from '../context/errorContext'
import Dropdown from '../components/Dropdown'

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

const Playground = () => {
  const [ongoingRequest, setOngoingRequest] = useState(false)
  const [text, setText] = useState('')
  const [variableMappings, setVariableMappings] = useState<VariableMappings>({})
  const { setError } = useError()

  const [config, setConfig] = useState({
    system_prompt: '',
    user_name: 'User',
    bot_name: 'TitanBot',
    generation_parameters: {
      consumer_group: 'primary',
      max_new_tokens: 300,
      sampling_topk: 10,
      sampling_topp: 1.0,
      sampling_temperature: 1.0,
      regex_string: '',
      json_schema: '',
    },
  })

  const { deploymentGroups, fetchDeploymentGroups, refreshing, ready } = useDeploymentGroup()
  const [selectedDeploymentGroup, setSelectedDeploymentGroup] = useState<string>('')
  const [isValidJson, setIsValidJson] = useState<boolean>(true)
  const [isValidRegex, setIsValidRegex] = useState<boolean>(true)
  const [managementUrl, setManagementUrl] = useState<string | null>(null)
  const [readerId, setReaderId] = useState<string | null>(null)

  function handleButtonClick() {
    if (!ongoingRequest) {
      sendData()
    } else {
      cancelRequest()
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
    setOngoingRequest(true)
    const url = 'generate_stream'
    const object: RequestObject = {
      text: replaceVariablesInText(text, variableMappings),
      ...config.generation_parameters,
    }

    if (object.regex_string === '') {
      delete object.regex_string
    }
    if (object.json_schema === '') {
      delete object.json_schema
    }

    function checkVal(key: string, val: string) {
      if (key === 'json_schema' && val !== '') {
        try {
          return JSON.parse(val)
        } catch (e) {
          console.log(e)
        }
      }
      return val
    }
    const body = JSON.stringify(object, checkVal)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body,
        signal: controller.signal,
      })
      if (response.body) {
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
          setText((prev) => prev + value.data)
        }
        setOngoingRequest(false)
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
      } else {
        console.error('An unexpected error occurred')
      }
      setOngoingRequest(false)
    }
    console.log('API called with \n', body)
  }

  function cancelRequest() {
    if (ongoingRequest && controller) {
      controller.abort()
    }
  }

  function replaceVariablesInText(text: string, variableMappings: VariableMappings): string {
    return text.replace(/\{\{([\w]+)\}\}/g, (match, variableName) => {
      return variableMappings[variableName] || match // Use the matched string as a fallback
    })
  }


  // Function to fetch chat templates
  const fetchChatTemplate = async (readerId:string, withSystemPrompt = true) => {
    const url = `chat_template/${readerId}`;
    const body = withSystemPrompt ? {
      "inputs": [[
        {"role": "system", "content":"{{system prompt}}"},
        {"role":"user","content": "{{user message}}"}
      ]],
      "add_generation_prompt": true
    } : {
      "inputs": [[
        {"role":"user","content": "{{user message}}"}
      ]],
      "add_generation_prompt": true
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch the chat template');
    }

    return response.json(); // Parsing the JSON response
  };



  useEffect(() => {
    function extractVariables() {
      const variablePattern = /\{\{([\w]+)\}\}/g
      let match: string[] | null
      const currentVariableMappings: { [key: string]: true } = {}
      setVariableMappings((prev) => {
        const newVariableMappings = { ...prev }
        while ((match = variablePattern.exec(text)) !== null) {
          if (match[1]) {
            currentVariableMappings[match[1]] = true
            // If the variable is not already in the variableMappings, add it
            if (!newVariableMappings[match[1]]) {
              newVariableMappings[match[1]] = ''
            }
          }
        }
        // Delete entries in newVariableMappings that don't exist in the currentVariableMappings
        for (const variable in newVariableMappings) {
          if (!currentVariableMappings[variable]) {
            delete newVariableMappings[variable]
          }
        }
        return newVariableMappings
      })
    }
    extractVariables()
  }, [text])

  // Update the config whenever the selected deployment group changes
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      generation_parameters: {
        ...prev.generation_parameters,
        consumer_group: selectedDeploymentGroup,
      },
    }))
  }, [selectedDeploymentGroup])

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

  useEffect(() => {  
    fetchManagementUrl()
  }, [managementUrl])

  const fetchReaderGroups = async () => {
    if (managementUrl != null && selectedDeploymentGroup != '') {
      try {
        const response = await fetch(managementUrl + '/reader_groups')
        if (!response.ok) {
          throw new Error('Failed to fetch the reader group')
        }
        
        const data = await response.json()
        const readerGroup = data[selectedDeploymentGroup][0]["reader_id"]
        
        console.log('Reader Group In fetch Reader Group:', readerGroup)
        return readerGroup
        // Do something with the data
      } catch (error) {
        console.error('Error:', error)
      }
    }
  }

  const fetchTemplate = async (readerId_: string) => {
    try {
      const data = await fetchChatTemplate(readerId_); // Fetch chat template with system prompt
      // console.log('Data:', data.messages[0])
      setText(data.messages[0]); // Set the fetched data as text
    } catch (error) {
      console.log("System prompt template failed, trying without system prompt. Error:", error);

      try {
        const data = await fetchChatTemplate(readerId_, false); // Fetch chat template without system prompt
        setText(data.messages[0]); // Set the fetched data as text
      } catch (error) {
        console.log("Couldn't fetch the chat template. Setting the default text to empty string.");
        setText(''); // Set default text to empty string on failure
      }
    }
  };
  
  // fetch the chat template if available for the reader group.
  useEffect(() => {
    fetchReaderGroups().then(readerGroup =>{
      
      if (readerGroup == null) {
        console.log("Reader ID is null. Skipping the chat template fetch.");
        return;
      }
      fetchTemplate(readerGroup);
  
      return () => {
        controller.abort(); 
      };
  
    }) // readerId is a promise


  }, [selectedDeploymentGroup]);


  return (
    <div id='container' className='px-4 grid grid-cols-1 sm:grid-cols-[1fr,300px]'>
      <div id='playground-box' className='form-style px-4 pb-8 flex flex-col'>
        <div className='content-header mb-4'>
          <div className='flex flex-row'>
            <div className='text-4xl'>Takeoff Playground</div>
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
        <textarea
          id='textarea'
          className='p-4 shadow-md rounded mb-4 text-gray-900 resize-none'
          placeholder='Start typing here'
          disabled={ongoingRequest}
          value={text}
          onInput={(e) => {
            setText(e.currentTarget.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleButtonClick()
            }
          }}
        ></textarea>
        <button
          id='action-button'
          type='button'
          className='button-style select-none font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline items-start disabled:text-slate-500'
          onClick={handleButtonClick}
          disabled={!(ongoingRequest || isValidJson || isValidRegex)}
        >
          {ongoingRequest ? 'Cancel' : 'Send'}
          {ongoingRequest ? (
            <FontAwesomeIcon icon={faXmark} className='ml-1' />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} className='ml-1' />
          )}
        </button>
      </div>
      <SettingsPanel
        config={config}
        setConfig={setConfig}
        variableMappings={variableMappings}
        setVariableMappings={setVariableMappings}
        isValidJson={isValidJson}
        setIsValidJson={setIsValidJson}
        isValidRegex={isValidRegex}
        setIsValidRegex={setIsValidRegex}
      />
    </div>
  )
}

export default Playground
