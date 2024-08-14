// Contains information about pre-set models
type DeviceInfo = {
  name: string
  size: number
}

export const DEVICES: DeviceInfo[] = [
  {
    name: 'NVIDIA A10',
    size: 24,
  },
  {
    name: 'NVIDIA A100 (40GB)',
    size: 40,
  },
  {
    name: 'NVIDIA A100 (80GB)',
    size: 80,
  },
  {
    name: 'NVIDIA H100 PCIe',
    size: 80,
  },
  {
    name: 'NVIDIA H100 SXM',
    size: 80,
  },
  {
    name: 'NVIDIA H100 NVL',
    size: 188,
  },
  {
    name: 'NVIDIA L40',
    size: 48,
  },
  {
    name: 'NVIDIA GeForce RTX 4090',
    size: 24,
  },
  {
    name: 'NVIDIA RTX 3060 (12GB)',
    size: 12,
  },
  {
    name: 'NVIDIA RTX 3060 (8GB)',
    size: 8,
  },
]

export default DEVICES
