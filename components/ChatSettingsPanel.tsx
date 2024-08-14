import React from 'react'
import { ChatConfig, SetChatConfig } from '../types/types'

// Types for SettingsPanel

type ChatSettingsPanelProps = {
  config: ChatConfig
  setConfig: SetChatConfig
}

const ChatSettingsPanel = ({ config, setConfig }: ChatSettingsPanelProps) => {
  return (
    <div id='settings-panel' className='mt-4 mx-4'>
      <h3 className='text-xl'>Generation Config</h3>
      <div className='accordion-content mb-2' id='generation-config'>
        <form
          id='config-form'
          // onsubmit="saveConfig(event)"
        >
          <div className='py-1'>
            <label className='block py-2 text-sm' htmlFor='system-prompt'>
              System Prompt
            </label>
            <input
              id='system-prompt'
              type='text'
              className='block px-4 py-2 text-sm w-full config-input'
              value={config.system_prompt}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  system_prompt: e.target.value,
                }))
              }
            />
            <label className='block py-2 text-sm' htmlFor='sampling_temperature'>
              Temperature
            </label>
            <input
              id='sampling-temperature'
              type='number'
              step={0.01}
              className='block px-4 py-2 text-sm w-full config-input'
              value={config.generation_parameters.sampling_temperature}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  generation_parameters: {
                    ...prev.generation_parameters,
                    sampling_temperature: parseFloat(e.target.value),
                  },
                }))
              }
              onBlur={(e) => {
                if (e.target.value === '' || e.target.value === null) {
                  setConfig((prev) => ({
                    ...prev,
                    generation_parameters: {
                      ...prev.generation_parameters,
                      sampling_temperature: 0.7,
                    },
                  }))
                }
              }}
              placeholder='0.7'
            />
            <label className='block py-2 text-sm' htmlFor='sampling-topp'>
              Sampling top p
            </label>
            <input
              id='sampling-topp'
              type='number'
              step={0.01}
              min={0}
              max={1}
              className='block px-4 py-2 text-sm w-full config-input'
              value={config.generation_parameters.sampling_topp}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  generation_parameters: {
                    ...prev.generation_parameters,
                    sampling_topp: parseFloat(e.target.value),
                  },
                }))
              }
              onBlur={(e) => {
                if (e.target.value === '' || e.target.value === null) {
                  setConfig((prev) => ({
                    ...prev,
                    generation_parameters: {
                      ...prev.generation_parameters,
                      sampling_topp: 0.1,
                    },
                  }))
                }
              }}
              placeholder='1.0'
            />
            <label className='block py-2 text-sm' htmlFor='sampling-topk'>
              Sampling top k
            </label>
            <input
              id='sampling-topk'
              type='number'
              className='block px-4 py-2 text-sm w-full config-input'
              value={config.generation_parameters.sampling_topk}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  generation_parameters: {
                    ...prev.generation_parameters,
                    sampling_topk: parseFloat(e.target.value),
                  },
                }))
              }
              onBlur={(e) => {
                if (e.target.value === '' || e.target.value === null) {
                  setConfig((prev) => ({
                    ...prev,
                    generation_parameters: {
                      ...prev.generation_parameters,
                      sampling_topk: 50,
                    },
                  }))
                }
              }}
              min={0}
              placeholder='10'
            />
            <label className='block py-2 text-sm' htmlFor='generate-max-length'>
              Max generation length
            </label>
            <input
              id='generate-max-length'
              type='number'
              className='block px-4 py-2 text-sm w-full config-input'
              value={config.generation_parameters.max_new_tokens}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  generation_parameters: {
                    ...prev.generation_parameters,
                    max_new_tokens: parseFloat(e.target.value),
                  },
                }))
              }
              onBlur={(e) => {
                if (e.target.value === '' || e.target.value === null) {
                  setConfig((prev) => ({
                    ...prev,
                    generation_parameters: {
                      ...prev.generation_parameters,
                      max_new_tokens: 300,
                    },
                  }))
                }
              }}
              min={1}
              placeholder='300'
            />
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChatSettingsPanel
