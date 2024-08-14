/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import { Scatter } from 'react-chartjs-2'
import { useTheme } from '../context/themeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faRotate, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement, // This is required for bar charts
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartOptions, ChartData } from 'chart.js'
import { Colors } from 'chart.js'

ChartJS.register(
  Colors,
  CategoryScale,
  LinearScale,
  BarElement, // This is required for bar charts
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

function pruneKeys(obj: Record<string, unknown>) {
  const prunableKeys = ['__name__', 'instance', 'job']
  // remove the prunable keys from the object if they exist
  prunableKeys.forEach((key) => delete obj[key])
  return obj
}

function* cycle(iterable: any) {
  const saved = []
  for (const item of iterable) {
    yield item
    saved.push(item)
  }
  while (saved.length > 0) {
    for (const item of saved) {
      yield item
    }
  }
}

const palletes = (theme: 'dark' | 'light') => {
  return {
    dark: cycle([
      '#00a1c5',
      '#65c9d5',
      '#9ee7df',
      '#d0f9e2',
      '#ffffe0',
      '#ffada4',
      '#f76e7d',
      '#df4566',
      '#c33e60',
    ]),
    light: cycle([
      '#0077B6', // Deep Sky Blue
      '#0096C7', // Pacific Blue
      '#00B4D8', // Sky Blue Crayola
      '#48CAE4', // Middle Blue
      '#90E0EF', // Light Blue
      '#FFB4A2', // Melon
      '#FF9292', // Salmon Pink
      '#FF6B6B', // Bittersweet
      '#FF4B5C', // Sunset Orange
    ]),
  }[theme]
}
// represents information about a Series or a Bin
type Info = {
  [key: string]: string
}

// A single sample in a time series
type Sample = {
  timestamp: number
  value: number
}

// A single time series
type Series = {
  info: Info
  samples: Sample[]
}

// StatsResponse
type StatsResponse = {
  stats: Series[]
}

interface ChartProps {
  triggerRefresh: boolean
  target: string | null
  query: string
  x_axis_label: string
}

const EmptyChart = (props: any) => {
  // tailwind classes to make a square box with centered text
  return <div className='flex items-center justify-center h-full w-full'>{props.children}</div>
}

const InfoPopover = ({ infoText }: any) => {
  const [showPopover, setShowPopover] = useState(false)

  const popoverStyle: React.CSSProperties = {
    position: 'absolute',
    width: '16rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'black',
    color: 'white',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    left: '50%',
    top: '100%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    display: showPopover ? 'block' : 'none',
  }

  return (
    <div className='relative flex items-center'>
      <FontAwesomeIcon
        icon={faInfoCircle}
        className='cursor-pointer'
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
      />
      <div style={popoverStyle}>{infoText}</div>
    </div>
  )
}

const LineChart: React.FC<ChartProps> = ({ triggerRefresh, target, query, x_axis_label }) => {
  const [chartData, setChartData] = useState<ChartData<'scatter'> | null>(null)
  const [chartOptions, setChartOptions] = useState<ChartOptions<'scatter'>>({})
  const [url, setManagementUrl] = useState<string | null>(null)

  const { theme } = useTheme()

  useEffect(() => {
    const fetchData = async () => {
      const pallette = palletes(theme)
      try {
        // If the port hasn't been saved
        // fetch the status from the /status endpoint. The ports tuple in the config gives the (serving_port, target_port).
        // On fetch, store the port
        if (url === null) {
          const response = await fetch('status')
          if (response.status !== 200) {
            console.log('Failed to fetch data')
            setChartData(null)
            return
          }
          const json = await response.json()

          const currentHost = window.location.hostname
          const targetPort = json.ports[1] // Replace with your target port
          const targetUrl = `http://${currentHost}:${targetPort}` // Replace /path with your endpoint
          setManagementUrl(targetUrl)
          return
        }

        const response = await fetch(
          `${url}/stats/series?since=360&target=${encodeURIComponent(
            target === null ? 'http://prometheus:9090' : target,
          )}&query=${query}`,
        )

        if (response.status !== 200) {
          console.log('Failed to fetch data')
          setChartData(null)
          return
        }

        const stats: StatsResponse = await response.json()

        if (stats.stats.length === 0) {
          console.log('Empty data')
          setChartData(null)
          return
        }

        // Transform the stats into datasets for Chart.js
        const newDatasets = stats.stats.map((series) => {
          // Extract and format data for the scatter plot
          const data = series.samples.map((sample) => ({
            x: sample.timestamp,
            y: sample.value,
          }))

          // Sort the info keys alphabetically and then format as 'key=value'

          pruneKeys(series.info)
          function compare(a: any, b: any) {
            const specialString = 'path'

            // Check if 'a[0]' contains the special string and 'b[0]' does not
            if (a[0].includes(specialString) && !b[0].includes(specialString)) {
              return -1 // 'a[0]' should come before 'b[0]'
            }

            // Check if 'b[0]' conta[0]ins the special string and 'a' does not
            if (!a[0].includes(specialString) && b[0].includes(specialString)) {
              return 1 // 'b[0]' should come before 'a[0]'
            }

            // For other cases, sort normally
            return a[0].localeCompare(b[0])
          }
          const sortedInfo = Object.entries(series.info).sort((a, b) => compare(a, b))
          const label = sortedInfo.map(([key, value]) => `${key}=${value}`).join(', ')

          const nextColor = pallette.next().value
          return {
            label,
            data,
            showLine: true,
            borderColor: nextColor,
            backgroundColor: nextColor,
          }
        })

        setChartData({
          datasets: newDatasets,
        })

        const options: ChartOptions<'scatter'> = {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              grid: {
                color: theme === 'dark' ? 'white' : 'black',
              },
              title: {
                display: true,
                text: x_axis_label,
                color: theme === 'dark' ? 'white' : 'black',
              },
              ticks: {
                color: theme === 'dark' ? 'white' : 'black',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Time',
                color: theme === 'dark' ? 'white' : 'black',
              },
              grid: {
                color: theme === 'dark' ? 'white' : 'black',
              },
              ticks: {
                // format the x axis as a time
                color: theme === 'dark' ? 'white' : 'black',
                callback: (value) => {
                  // Ensure the value is a number before converting it
                  if (typeof value === 'number') {
                    return new Date(value * 1000).toLocaleTimeString()
                  }
                  return value
                },
              },
            },
          },
          plugins: {
            legend: {
              display: true,
              labels: {
                color: theme === 'dark' ? 'white' : 'black',
              },
            },
            tooltip: {
              callbacks: {
                // format the value on the tooltip. Shows just the rate, not the timestamp.
                label: (context) => {
                  let label = context.dataset.label || ''
                  if (label) {
                    label += ': '
                  }
                  if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat().format(context.parsed.y)
                  }
                  const broken_into_sections = label.split(', ')
                  return broken_into_sections
                },
              },
            },
          },
        }
        setChartOptions(options)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [theme, triggerRefresh, target])

  return chartData === null ? (
    <EmptyChart>Waiting for data...</EmptyChart>
  ) : (
    <Scatter data={chartData} options={chartOptions}></Scatter>
  )
}

const Dashboard = () => {
  const [triggerRefresh, setTriggerRefresh] = useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [target, setTarget] = useState<string>('http://localhost:9090')

  const refreshCharts = () => {
    setIsRefreshing(true)
    // Trigger your refresh logic here
    setTriggerRefresh((prev) => !prev) // Assuming this is how you trigger a refresh

    // Stop spinning after a fixed duration (e.g., 2 seconds)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      refreshCharts()
    }, 6000) // Refresh every 1 minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className='p-8'>
      <div className='flex flex-col'>
        <div className='flex items-center justify-center mb-4'>
          <h1 className='text-2xl font-bold'>Metrics Dashboard</h1>
          <button onClick={refreshCharts} className='flex items-center justify-center'>
            <div className='refresh-button ml-2'>
              {isRefreshing ? (
                <FontAwesomeIcon icon={faSpinner} className='text-2xl animate-spin' />
              ) : (
                <FontAwesomeIcon icon={faRotate} className='text-2xl' />
              )}
            </div>
          </button>
        </div>
        <div className='flex items-center justify-center mb-6'>
          <label className='ml-4 mr-2'>Prometheus URL </label>
          <InfoPopover
            infoText='The url at which your prometheus instance is hosted. This instance should be scraping the takeoff server on its /metrics endpoint. To use the bundled prometheus instance, set to http://localhost:9090. NOTE: this will be accessed from your takeoff server deployment, not your browser.'
            className='mr-4'
          />
          <input
            id='target'
            type='text'
            className='ml-4 text-gray-700 text-sm p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500'
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          ></input>
        </div>
      </div>

      <div className='flex flex-col md:flex-row justify-center gap-4'>
        {/* Line Chart with Title */}
        <div className='flex-1 min-w-0 max-w-4xl mx-auto'>
          <h2 className='text-center text-lg font-semibold mb-4'>Requests per Second</h2>
          <div className='relative w-full h-96'>
            <LineChart
              triggerRefresh={triggerRefresh}
              target={target}
              query="rate(http_requests_total{path=~'(/generate|/generate_stream)'}[30s])"
              x_axis_label='Requests Per Second'
            />
          </div>
          <p className='text-center text-xs mb-4'>
            Fig. 1: Average requests per second, averaged over 30s intervals, over the last day.
          </p>
        </div>

        {/* Histogram Chart with Title */}
        <div className='flex-1 min-w-0 max-w-4xl mx-auto'>
          <h2 className='text-center text-lg font-semibold mb-4'>Generated Tokens per Second</h2>
          <div className='relative w-full h-96'>
            <LineChart
              triggerRefresh={triggerRefresh}
              target={target}
              query='rate(generated_tokens_sum[30s])'
              x_axis_label='Tokens Per Second'
            />
          </div>
          <p className='text-center text-xs mb-4'>
            Fig. 2: Average generated tokens per second, averaged over 30s intervals, over the last
            day.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
