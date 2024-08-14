import React, { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../context/themeContext'

import MODELS from '../utils/models'
import DEVICES from '../utils/devices'

type Precision = 'fp32' | 'fp16' | 'int8' | 'int4'

interface ModelSizeBarChartProps {
  modelSize: number // in GB
  largestModelSize: number // largest model in full precision (fp32)
  modelPrecision: Precision // enum of fp32, fp16, int8, int4
  deviceMemorySet: boolean // true if device memory is set
}

interface InferenceRuntimeLineChartProps {
  availableMemory: AvailableMemory // in GB
  memoryPerInput: number // in GB
}

interface LineChartData {
  seqLength: number
  batchSize: number
}

interface AvailableMemory {
  int4: number
  int8: number
  fp16: number
  fp32: number
}

// Table containing the mapping of backends to precisions
const BackendPrecisionTable = () => {
  return (
    <table className='table-auto border-collapse'>
      <thead>
        <tr>
          <th className='table-cell px-4 py-2'>Backend</th>
          <th className='table-cell px-4 py-2'>GPU</th>
          <th className='table-cell px-4 py-2'>CPU</th>
          <th className='table-cell px-4 py-2'>Accuracy</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className='table-cell px-4 py-2'>fast</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>⭐⭐⭐</td>
        </tr>
        <tr>
          <td className='table-cell px-4 py-2'>compress-fast</td>
          <td className='table-cell px-4 py-2'>4</td>
          <td className='table-cell px-4 py-2'>8</td>
          <td className='table-cell px-4 py-2'>⭐⭐</td>
        </tr>
        <tr>
          <td className='table-cell px-4 py-2'>compress</td>
          <td className='table-cell px-4 py-2'>4</td>
          <td className='table-cell px-4 py-2'>4</td>
          <td className='table-cell px-4 py-2'>⭐</td>
        </tr>
        <tr>
          <td className='table-cell px-4 py-2'>baseline</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>⭐⭐⭐</td>
        </tr>
      </tbody>
    </table>
  )
}

// Bar chart for model footprint
function ModelSizeBarChart({
  modelSize,
  largestModelSize,
  modelPrecision,
  deviceMemorySet,
}: ModelSizeBarChartProps) {
  const { theme } = useTheme()
  const chartRef = useRef<SVGSVGElement>(null)

  // Constants for your chart
  const width = 600
  const height = 50 // adjust as needed

  useEffect(() => {
    // Remove any existing SVG to avoid duplication
    d3.select(chartRef.current).selectAll('*').remove()

    const svg = d3.select(chartRef.current).attr('width', width).attr('height', height)

    // Scale for the width of the bar
    const xScale = d3.scaleLinear().domain([0, largestModelSize]).range([0, width])

    // Out of memory - Draw a transparent bar
    if (modelSize > largestModelSize) {
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .style('stroke', theme === 'dark' ? '#f9fafb' : '#181f26')
        .style('stroke-dasharray', '4, 4')
        .style('stroke-width', '2px')
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
        .text('Out of Memory')
    } else {
      // Draw the coloured bar for model
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale(modelSize))
        .attr('height', height)
        .attr('fill', chooseColor(modelPrecision))

      if (deviceMemorySet) {
        // Draw the spare space in gray
        svg
          .append('rect')
          .attr('x', xScale(modelSize))
          .attr('y', 0)
          .attr('width', xScale(largestModelSize - modelSize))
          .attr('height', height)
          .attr('fill', 'transparent')
          .style('stroke', chooseColor(modelPrecision))
          .style('stroke-width', '2px')
      }
    }
  }, [modelSize, largestModelSize, modelPrecision, deviceMemorySet, theme])

  // Function to choose color based on model precision
  function chooseColor(precision: Precision) {
    const colors = {
      fp32: '#e45f5b',
      fp16: '#ffc068',
      int8: '#71cce9',
      int4: '#383d95',
    }
    return colors[precision] || 'gray' // default color
  }

  return <svg ref={chartRef}></svg>
}

// Line chart for maximum batch size / sequence length during inference runtime
function InferenceRuntimeLineChart({
  availableMemory,
  memoryPerInput,
}: InferenceRuntimeLineChartProps) {
  const { theme } = useTheme()
  const chartRef = useRef(null)
  const maxSeqLength = 4096
  const maxBatchSize = 128

  useEffect(() => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 }
    const width = 600 - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom
    const precisions = [
      { name: 'FP32', color: '#e45f5b' },
      { name: 'FP16', color: '#ffc068' },
      { name: 'INT8', color: '#71cce9' },
      { name: 'INT4', color: '#383d95' },
    ]

    const svg = d3.select(chartRef.current)
    svg.selectAll('*').remove()

    // Scales
    const xScale = d3.scaleLinear().domain([0, maxSeqLength]).range([0, width])

    const yScale = d3.scaleLinear().domain([0, maxBatchSize]).range([height, 0])

    // Axes
    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)
    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
      .call(xAxis)

    svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`).call(yAxis)

    // Axes labels
    svg
      .append('text')
      .attr('transform', `translate(${width / 2 + margin.left}, ${height + margin.top + 40})`)
      .style('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
      .text('Sequence Length')

    svg
      .append('text')
      .attr('transform', `rotate(-90)`)
      .attr('y', 0)
      .attr('x', 0 - height / 2 - margin.top)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
      .text('Batch Size')

    // Legend
    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 20}, 20)`) // Adjust the positioning as needed

    precisions.forEach((precision, index) => {
      const legendItem = legend.append('g').attr('transform', `translate(0, ${index * 30})`) // Vertical spacing between items

      legendItem
        .append('rect')
        .attr('x', 10) // Position text right of the colored square
        .attr('y', 10) // Align text with the square
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', precision.color)

      legendItem
        .append('text')
        .attr('x', 30) // Position text right of the colored square
        .attr('y', 16) // Align text with the square
        .text(precision.name)
        .style('font-size', '16px')
        .style('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
        .attr('alignment-baseline', 'middle')
    })
    legend
      .append('rect')
      .attr('class', 'legend-box')
      .attr('width', 80) // Width of the border
      .attr('height', precisions.length * 30) // Height depending on the number of items
      .style('fill', 'none')
      .style('stroke-width', '1px')
      .style('stroke', theme === 'dark' ? '#f9fafb' : '#181f26')

    const tooltip = d3.select('#tooltip')

    // Draw the lines
    for (const [precision, memory] of Object.entries(availableMemory)) {
      // Generator for sequence lengths
      const sequenceLengths = d3
        .range(1, maxSeqLength, 1)
        .map((seqLength) => {
          return { seqLength, batchSize: memory / (seqLength * memoryPerInput) }
        })
        .filter((seqLength) => seqLength.batchSize <= maxBatchSize)
        .filter((seqLength) => seqLength.batchSize > 1 && seqLength.seqLength > 1)

      const lineGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
      const line = d3
        .line<LineChartData>()
        .x((d) => xScale(d.seqLength))
        .y((d) => yScale(d.batchSize))
        .curve(d3.curveBasis)

      lineGroup
        .append('path')
        .datum(sequenceLengths)
        .attr('fill', 'none')
        .attr('stroke', chooseColor(precision as Precision))
        .attr('stroke-width', 4)
        .attr('d', line)
        .on('mouseover', () => {
          tooltip.style('opacity', 1)
          tooltip.style('background-color', theme === 'dark' ? '#181f26' : '#f9fafb')
        })
        .on('mousemove', (event) => {
          tooltip.selectAll('text').remove()
          const [x, y] = d3.pointer(event)
          const xValue = xScale.invert(x)
          const yValue = yScale.invert(y)
          tooltip
            .html(`Sequence Length: ${xValue.toFixed(0)}<br/>Batch Size: ${yValue.toFixed(0)}`)
            .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY + 10 + 'px')
        })
        .on('mouseout', () => {
          tooltip.style('opacity', 0)
        })
    }
  }, [availableMemory, memoryPerInput, theme]) // Re-render the graph when these values change
  // Function to choose color based on model precision
  function chooseColor(precision: Precision) {
    const colors = {
      fp32: '#e45f5b',
      fp16: '#ffc068',
      int8: '#71cce9',
      int4: '#383d95',
    }
    return colors[precision] || 'gray' // default color
  }

  return (
    <>
      <div id='tooltip'></div>
      <svg ref={chartRef} width={600} height={400} />
    </>
  )
}

// Calculator page
const Calculator = () => {
  // Model Parameters (billions)
  const [modelParams, setModelParams] = useState<number | null>(null)
  const [hiddenSize, setHiddenSize] = useState<number | null>(null)
  const [numLayers, setNumLayers] = useState<number | null>(null)

  // Device Memory (GB)
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null)

  // Inputs
  const [batchSize, setBatchSize] = useState<number | null>(null)
  const [seqLength, setSeqLength] = useState<number | null>(null)

  // Tabs for model selection and device selection
  const [modelSelectionTab, setModelSelectionTab] = useState<boolean>(true)
  const [deviceSelectionTab, setDeviceSelectionTab] = useState<boolean>(true)

  // Calculate model memory
  function calculateMemory(params: number, precision: Precision) {
    const paramSize = { fp32: 4, fp16: 2, int8: 1, int4: 0.5 }
    return params * paramSize[precision] // in GB
  }

  // Calculate memory per input (sequence length and batch size)
  function calculateMemoryPerInput(hiddenSize: number, numLayers: number) {
    const memoryPerInput = 4 * hiddenSize * numLayers
    return memoryPerInput / 1_000_000_000 // in GB
  }

  // Calculate maximum batch size / sequence length
  function calculateMaxInputSize(
    deviceMemory: number,
    modelParams: number,
    hiddenSize: number,
    numLayers: number,
    precision: Precision,
    inputSize: number,
  ) {
    const memoryPerInput = calculateMemoryPerInput(hiddenSize, numLayers)
    const availableMemory = deviceMemory - calculateMemory(modelParams, precision)
    return Math.floor(availableMemory / (memoryPerInput * inputSize))
  }

  // Check if memory is valid for batch size / sequence length combination
  function calculateMemoryValid(
    deviceMemory: number,
    modelParams: number,
    hiddenSize: number,
    numLayers: number,
    precision: Precision,
    batchSize: number,
    seqLength: number,
  ) {
    const memoryPerInput = calculateMemoryPerInput(hiddenSize, numLayers)
    const availableMemory = deviceMemory - calculateMemory(modelParams, precision)
    return availableMemory >= memoryPerInput * batchSize * seqLength
  }

  return (
    <div className='px-4 grid grid-cols-1 sm:grid-cols-[480px,1fr]'>
      <div id='left-container' className='px-4'>
        <div className='text-4xl mb-2'>Model Memory Calculator</div>
        <div>
          Use our Model Memory Calculator to help you estimate the memory footprint of your model
          for different precisions and the maximum batch size / sequence length combination you can
          run on your device.
        </div>
        <div className='calculator-input-box'>
          <div className='text-2xl calculator-input-title'>Model</div>
          <div className='calculator-input-content'>
            <div className='mb-2'>
              <button
                className={`${
                  modelSelectionTab ? 'calculator-input-tab-active' : 'calculator-input-tab'
                }`}
                onClick={() => {
                  setModelSelectionTab(true)
                  setModelParams(null)
                  setHiddenSize(null)
                  setNumLayers(null)
                }}
              >
                Model Selection
              </button>
              <button
                className={`${
                  modelSelectionTab ? 'calculator-input-tab' : 'calculator-input-tab-active'
                }`}
                onClick={() => {
                  setModelSelectionTab(false)
                  setModelParams(null)
                  setHiddenSize(null)
                  setNumLayers(null)
                }}
              >
                Custom Model
              </button>
            </div>
            <div>
              {modelSelectionTab ? (
                <>
                  <label htmlFor='model'>Select a Model</label>
                  <select
                    id='model'
                    className='calculator-select'
                    onChange={(e) => {
                      setModelParams(Number(e.target.value))
                      setHiddenSize(
                        Number(
                          e.target.options[e.target.selectedIndex].getAttribute('data-hiddenSize'),
                        ),
                      )
                      setNumLayers(
                        Number(
                          e.target.options[e.target.selectedIndex].getAttribute('data-numLayers'),
                        ),
                      )
                    }}
                  >
                    <option value=''>None selected</option>
                    {MODELS.map((model) => {
                      return (
                        <option
                          key={model.name}
                          value={model.params}
                          data-hiddenSize={model.hidden_size}
                          data-numLayers={model.num_hidden_layers}
                        >
                          {model.name}
                        </option>
                      )
                    })}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor='modelParams'>Model Parameters (in billions)</label>
                  <input
                    type='number'
                    id='modelParams'
                    className='calculator-input mb-2'
                    placeholder='e.g. 7 (for LLaMA-7B)'
                    value={modelParams || ''}
                    min={0}
                    onChange={(e) => setModelParams(Number(e.target.value))}
                  />
                  <label htmlFor='hiddenSize'>Hidden Size</label>
                  <input
                    type='number'
                    id='hiddenSize'
                    className='calculator-input mb-2'
                    placeholder='e.g. 4096 (for LLaMA-7B)'
                    value={hiddenSize || ''}
                    min={1}
                    onChange={(e) => setHiddenSize(Number(e.target.value))}
                  />
                  <label htmlFor='numLayers'>Number of Layers</label>
                  <input
                    type='number'
                    id='numLayers'
                    className='calculator-input'
                    placeholder='e.g. 32 (for LLaMA-7B)'
                    value={numLayers || ''}
                    min={1}
                    onChange={(e) => setNumLayers(Number(e.target.value))}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        <div className='calculator-input-box'>
          <div className='text-2xl calculator-input-title'>Device</div>
          <div className='calculator-input-content'>
            <div className='mb-2'>
              <button
                className={`${
                  deviceSelectionTab ? 'calculator-input-tab-active' : 'calculator-input-tab'
                }`}
                onClick={() => {
                  setDeviceSelectionTab(true)
                  setDeviceMemory(null)
                }}
              >
                Device Selection
              </button>
              <button
                className={`${
                  deviceSelectionTab ? 'calculator-input-tab' : 'calculator-input-tab-active'
                }`}
                onClick={() => {
                  setDeviceSelectionTab(false)
                  setDeviceMemory(null)
                }}
              >
                Custom Device
              </button>
            </div>
            <div>
              {deviceSelectionTab ? (
                <>
                  <label htmlFor='device'>Select a Device</label>
                  <select
                    id='device'
                    className='calculator-select'
                    onChange={(e) => setDeviceMemory(Number(e.target.value))}
                  >
                    <option value=''>None selected</option>
                    {DEVICES.map((device) => {
                      return (
                        <option key={device.name} value={device.size}>
                          {device.name}
                        </option>
                      )
                    })}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor='deviceMemory'>Device RAM (in GB)</label>
                  <input
                    type='number'
                    id='deviceMemory'
                    className='calculator-input'
                    placeholder='e.g. 7 (for LLaMA-7B)'
                    value={deviceMemory || ''}
                    min={0}
                    onChange={(e) => setDeviceMemory(Number(e.target.value))}
                  />
                </>
              )}
            </div>
          </div>
        </div>
        <div className='calculator-box'>
          <div className='text-2xl ml-5 mb-4'>Backend Precision Table</div>
          <div className='ml-5 mb-4'>
            <BackendPrecisionTable />
          </div>
          <div className='ml-5'>
            This table shows the precision used by each Takeoff backend for CPUs and GPUs, as well
            as their accuracy preservation.
          </div>
        </div>
        <div className='calculator-box'>
          <div className='text-2xl ml-5 mb-4'>Input parameters</div>
          <div className='ml-5 mb-4'>
            <strong>Sequence Length</strong>: The combined length of input tokens and output tokens.
            To restrict the maximum sequence length for inference on Takeoff, use the API parameters{' '}
            <code>prompt_new_tokens</code> for input tokens and <code>max_new_tokens</code> for
            output tokens when making a request.
          </div>
          <div className='ml-5'>
            <strong>Batch Size</strong>: The number of sequences that can be processed in parallel.
            To set a maximum batch size for inference on Takeoff, set the environment variable{' '}
            <code>TAKEOFF_MAX_BATCH_SIZE</code> to your desired value.
          </div>
        </div>
      </div>
      <div id='right-container'>
        {modelParams ? (
          <>
            <div className='chart'>
              <div className='flex flex-col items-center'>
                <div className='text-2xl'>Model Footprint</div>
              </div>
              <div className='chart-row my-8'>
                <div className='chart-row-title'>FP32</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'fp32')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp32')}
                  modelPrecision='fp32'
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className='chart-row-size ml-8'>
                  {calculateMemory(modelParams, 'fp32')}{' '}
                  {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>
              <div className='chart-row mb-8'>
                <div className='chart-row-title'>FP16</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'fp16')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp32')}
                  modelPrecision='fp16'
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className='chart-row-size ml-8'>
                  {calculateMemory(modelParams, 'fp16')}{' '}
                  {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>
              <div className='chart-row mb-8'>
                <div className='chart-row-title'>INT8</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'int8')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp32')}
                  modelPrecision='int8'
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className='chart-row-size ml-8'>
                  {calculateMemory(modelParams, 'int8')}{' '}
                  {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>
              <div className='chart-row mb-8'>
                <div className='chart-row-title'>INT4</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'int4')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp32')}
                  modelPrecision='int4'
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className='chart-row-size ml-8'>
                  {calculateMemory(modelParams, 'int4')}{' '}
                  {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>
              <div style={{ maxWidth: 800 }}>
                This chart shows your model&apos;s memory footprint for different precisions. Note
                that the values shown are an estimate and the actual memory footprint may vary. You
                will also need to account for the memory required for the inputs.
              </div>
            </div>
          </>
        ) : null}
        {hiddenSize && numLayers && deviceMemory && modelParams ? (
          <>
            <div className='chart'>
              <div className='flex flex-col items-center'>
                <div className='text-2xl'>Maximum Batch Size / Sequence Length</div>
              </div>
              <div className='flex flex-row'>
                <InferenceRuntimeLineChart
                  availableMemory={{
                    int4: deviceMemory - calculateMemory(modelParams, 'int4'),
                    int8: deviceMemory - calculateMemory(modelParams, 'int8'),
                    fp16: deviceMemory - calculateMemory(modelParams, 'fp16'),
                    fp32: deviceMemory - calculateMemory(modelParams, 'fp32'),
                  }}
                  memoryPerInput={calculateMemoryPerInput(hiddenSize, numLayers)}
                />
                <div className='chart-side-panel ml-4 pt-4'>
                  <div className='mb-2'>
                    Memory/token:{' '}
                    {(calculateMemoryPerInput(hiddenSize, numLayers) * 1_000_000).toFixed(0)} KB
                  </div>
                  <label htmlFor='batchSize'>Batch Size</label>
                  <input
                    type='number'
                    id='batchSize'
                    className='side-panel-input mb-2'
                    value={batchSize || ''}
                    min={1}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                  />
                  <label htmlFor='seqLength'>Sequence Length</label>
                  <input
                    type='number'
                    id='seqLength'
                    className='side-panel-input'
                    value={seqLength || ''}
                    min={1}
                    onChange={(e) => setSeqLength(Number(e.target.value))}
                  />
                  <div className='mt-4'>
                    {!batchSize && !seqLength ? (
                      <div>
                        Input a batch size or sequence length to see the maximum batch size or
                        sequence length you can run on your device.
                      </div>
                    ) : null}
                    {batchSize && !seqLength ? (
                      <>
                        <div>Max Sequence Lengths:</div>
                        <div>
                          FP32:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'fp32',
                              batchSize,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'fp32',
                                  batchSize,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          FP16:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'fp16',
                              batchSize,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'fp16',
                                  batchSize,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          INT8:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'int8',
                              batchSize,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'int8',
                                  batchSize,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          INT4:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'int4',
                              batchSize,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'int4',
                                  batchSize,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                      </>
                    ) : null}
                    {!batchSize && seqLength ? (
                      <>
                        <div>Max Batch Sizes:</div>
                        <div>
                          FP32:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'fp32',
                              seqLength,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'fp32',
                                  seqLength,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          FP16:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'fp16',
                              seqLength,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'fp16',
                                  seqLength,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          INT8:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'int8',
                              seqLength,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'int8',
                                  seqLength,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          INT4:{' '}
                          <strong>
                            {calculateMaxInputSize(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'int4',
                              seqLength,
                            ) > 0
                              ? calculateMaxInputSize(
                                  deviceMemory,
                                  modelParams,
                                  hiddenSize,
                                  numLayers,
                                  'int4',
                                  seqLength,
                                )
                              : 'Out of Memory'}
                          </strong>
                        </div>
                      </>
                    ) : null}
                    {batchSize && seqLength ? (
                      <>
                        <div>Total Memory Usage:</div>
                        <div>
                          FP32:{' '}
                          <strong>
                            {calculateMemoryValid(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'fp32',
                              batchSize,
                              seqLength,
                            )
                              ? (
                                  calculateMemory(modelParams, 'fp32') +
                                  calculateMemoryPerInput(hiddenSize, numLayers) *
                                    batchSize *
                                    seqLength
                                ).toFixed(2) + ' GB'
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          FP16:{' '}
                          <strong>
                            {calculateMemoryValid(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'fp16',
                              batchSize,
                              seqLength,
                            )
                              ? (
                                  calculateMemory(modelParams, 'fp16') +
                                  calculateMemoryPerInput(hiddenSize, numLayers) *
                                    batchSize *
                                    seqLength
                                ).toFixed(2) + ' GB'
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          INT8:{' '}
                          <strong>
                            {calculateMemoryValid(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'int8',
                              batchSize,
                              seqLength,
                            )
                              ? (
                                  calculateMemory(modelParams, 'int8') +
                                  calculateMemoryPerInput(hiddenSize, numLayers) *
                                    batchSize *
                                    seqLength
                                ).toFixed(2) + ' GB'
                              : 'Out of Memory'}
                          </strong>
                        </div>
                        <div>
                          INT4:{' '}
                          <strong>
                            {calculateMemoryValid(
                              deviceMemory,
                              modelParams,
                              hiddenSize,
                              numLayers,
                              'int4',
                              batchSize,
                              seqLength,
                            )
                              ? (
                                  calculateMemory(modelParams, 'int4') +
                                  calculateMemoryPerInput(hiddenSize, numLayers) *
                                    batchSize *
                                    seqLength
                                ).toFixed(2) + ' GB'
                              : 'Out of Memory'}
                          </strong>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div style={{ maxWidth: 800 }}>
                This chart shows the maximum batch size / sequence length combination you can run on
                your device for different precisions. While running your model on the compress int4
                backend may allow you to run larger batch sizes / sequence lengths, the inference
                runtime may be slower than the other backends.
              </div>
            </div>
          </>
        ) : null}
        {!modelParams ? (
          <div>Please select a predefined model or input your model params.</div>
        ) : null}
        {modelParams && !deviceMemory ? (
          <div>Please select a predefined device or input your device&apos;s memory.</div>
        ) : null}
        {modelParams && deviceMemory && !(hiddenSize && numLayers) ? (
          <div>Please input your model&apos;s hidden size and number of layers.</div>
        ) : null}
      </div>
    </div>
  )
}

export default Calculator
